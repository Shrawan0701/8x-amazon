import crypto from 'crypto';
import express from 'express';
import Razorpay from 'razorpay';
import { z } from 'zod';
import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { readCart } from './cart.js';
import { deliveryForSubtotal } from '../services/money.js';
import { sendOrderConfirmationEmail } from '../services/email.js';
import { asyncHandler, HttpError, requireEnv } from '../utils/http.js';

export const ordersRouter = express.Router();

function razorpay() {
  requireEnv('RAZORPAY_KEY_ID', config.razorpayKeyId);
  requireEnv('RAZORPAY_KEY_SECRET', config.razorpayKeySecret);
  return new Razorpay({ key_id: config.razorpayKeyId, key_secret: config.razorpayKeySecret });
}

function orderNumber() {
  return `AM-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

ordersRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `select
      o.*,
      count(oi.id)::int as item_count,
      coalesce(
        json_agg(oi.image_url order by oi.id) filter (where oi.image_url is not null),
        '[]'
      ) as thumbnails
     from orders o
     left join order_items oi on oi.order_id=o.id
     where o.user_id=$1
     group by o.id
     order by o.created_at desc`,
    [req.user.id]
  );
  res.json({ orders: rows });
}));

ordersRouter.get('/:id', requireAuth, validate(z.object({ params: z.object({ id: z.string().uuid() }) })), asyncHandler(async (req, res) => {
  const order = await query('select * from orders where id=$1 and user_id=$2', [req.validated.params.id, req.user.id]);
  if (!order.rowCount) throw new HttpError(404, 'Order not found.');
  const items = await query('select * from order_items where order_id=$1', [req.validated.params.id]);
  const address = order.rows[0].address_id
    ? await query('select full_name, phone, line1, line2, city, state, postal_code, country from addresses where id=$1 and user_id=$2', [order.rows[0].address_id, req.user.id])
    : { rows: [] };
  const payment = await query(
    'select razorpay_order_id, razorpay_payment_id, amount_cents, status, verified_at from payments where order_id=$1',
    [req.validated.params.id]
  );
  res.json({ order: order.rows[0], items: items.rows, address: address.rows[0] || null, payment: payment.rows[0] || null });
}));

ordersRouter.post('/create-payment', requireAuth, validate(z.object({
  body: z.object({
    address: z.object({
      fullName: z.string().min(2),
      phone: z.string().min(7),
      line1: z.string().min(3),
      line2: z.string().optional().default(''),
      city: z.string().min(2),
      state: z.string().min(2),
      postalCode: z.string().min(4),
      country: z.string().min(2).default('India')
    })
  })
})), asyncHandler(async (req, res) => {
  const cart = await readCart(req.user.id);
  if (!cart.items.length) throw new HttpError(400, 'Your cart is empty.');
  const result = await withTransaction(async (client) => {
    const subtotal = cart.items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
    const delivery = deliveryForSubtotal(subtotal);
    const total = subtotal + delivery;
    const address = req.validated.body.address;
    const addressRow = await client.query(
      `insert into addresses(user_id, full_name, phone, line1, line2, city, state, postal_code, country)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
      [req.user.id, address.fullName, address.phone, address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
    );
    const orderRow = await client.query(
      `insert into orders(user_id, address_id, order_number, subtotal_cents, delivery_cents, total_cents)
       values($1,$2,$3,$4,$5,$6) returning *`,
      [req.user.id, addressRow.rows[0].id, orderNumber(), subtotal, delivery, total]
    );
    const rzOrder = await razorpay().orders.create({
      amount: total,
      currency: 'INR',
      receipt: orderRow.rows[0].order_number,
      notes: { orderId: orderRow.rows[0].id, userId: req.user.id }
    });
    await client.query('update orders set razorpay_order_id=$1 where id=$2', [rzOrder.id, orderRow.rows[0].id]);
    await client.query(
      'insert into payments(order_id, razorpay_order_id, amount_cents, status) values($1,$2,$3,$4)',
      [orderRow.rows[0].id, rzOrder.id, total, 'created']
    );
    return { order: { ...orderRow.rows[0], razorpay_order_id: rzOrder.id }, razorpayOrder: rzOrder };
  });
  res.json({ ...result, keyId: config.razorpayKeyId });
}));

ordersRouter.post('/verify-payment', validate(z.object({
  body: z.object({
    orderId: z.string().uuid(),
    razorpay_payment_id: z.string().min(3),
    razorpay_order_id: z.string().min(3),
    razorpay_signature: z.string().min(10)
  })
})), asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const expected = crypto.createHmac('sha256', config.razorpayKeySecret)
    .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
    .digest('hex');
  if (expected !== body.razorpay_signature) throw new HttpError(400, 'Payment signature verification failed.');

  const result = await withTransaction(async (client) => {
    const orderResult = await client.query('select * from orders where id=$1 for update', [body.orderId]);
    const order = orderResult.rows[0];
    if (!order) throw new HttpError(404, 'Order not found.');
    if (req.user && order.user_id !== req.user.id) throw new HttpError(403, 'Order does not belong to this session.');
    if (order.razorpay_order_id !== body.razorpay_order_id) throw new HttpError(400, 'Payment order mismatch.');
    if (order.payment_status === 'paid') return { order, duplicate: true };

    const cart = await readCart(order.user_id);
    if (!cart.items.length) throw new HttpError(400, 'Cart is empty or already checked out.');
    for (const item of cart.items) {
      await client.query(
        `insert into order_items(order_id, product_id, product_name, product_brand, image_url, quantity, unit_price_cents, total_cents)
         values($1,$2,$3,$4,$5,$6,$7,$8)`,
        [order.id, item.product_id, item.name, item.brand, item.image_url, item.quantity, item.price_cents, item.price_cents * item.quantity]
      );
      await client.query('update products set stock=greatest(stock - $1, 0) where id=$2', [item.quantity, item.product_id]);
    }
    const updated = await client.query(
      `update orders set payment_status='paid', order_status='confirmed' where id=$1 returning *`,
      [order.id]
    );
    await client.query(
      `update payments set status='paid', razorpay_payment_id=$1, razorpay_signature=$2, verified_at=now()
       where order_id=$3`,
      [body.razorpay_payment_id, body.razorpay_signature, order.id]
    );
    await client.query('delete from cart_items using carts where cart_items.cart_id=carts.id and carts.user_id=$1', [order.user_id]);
    return { order: updated.rows[0], duplicate: false };
  });
  const items = await query('select * from order_items where order_id=$1', [body.orderId]);
  const user = await query('select id, name, email from users where id=$1', [result.order.user_id]);
  if (!result.duplicate && user.rows[0]) {
    try {
      await sendOrderConfirmationEmail(user.rows[0], result.order, items.rows);
    } catch (error) {
      console.error('Order confirmation email failed after payment verification:', error.message);
    }
  }
  res.json({ order: result.order, items: items.rows, duplicate: result.duplicate });
}));
