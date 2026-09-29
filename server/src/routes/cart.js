import express from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { deliveryForSubtotal } from '../services/money.js';
import { asyncHandler, HttpError } from '../utils/http.js';

export const cartRouter = express.Router();
cartRouter.use(requireAuth);

async function getCartId(client, userId) {
  const { rows } = await client.query(
    `insert into carts(user_id) values($1)
     on conflict(user_id) do update set updated_at=now()
     returning id`,
    [userId]
  );
  return rows[0].id;
}

export async function readCart(userId) {
  const { rows } = await query(
    `select ci.id, ci.quantity, p.id as product_id, p.name, p.slug, p.brand, p.price_cents, p.stock,
      (select url from product_images where product_id=p.id order by position limit 1) as image_url
     from carts c
     left join cart_items ci on ci.cart_id=c.id
     left join products p on p.id=ci.product_id
     where c.user_id=$1 and ci.id is not null
     order by ci.id`,
    [userId]
  );
  const subtotal = rows.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  const delivery = deliveryForSubtotal(subtotal);
  return { items: rows, subtotal_cents: subtotal, delivery_cents: delivery, total_cents: subtotal + delivery };
}

cartRouter.get('/', asyncHandler(async (req, res) => {
  await withTransaction((client) => getCartId(client, req.user.id));
  res.json({ cart: await readCart(req.user.id) });
}));

cartRouter.post('/items', validate(z.object({
  body: z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20).default(1) })
})), asyncHandler(async (req, res) => {
  const { productId, quantity } = req.validated.body;
  await withTransaction(async (client) => {
    const product = await client.query('select id, stock from products where id=$1', [productId]);
    if (!product.rowCount) throw new HttpError(404, 'Product not found.');
    if (product.rows[0].stock < quantity) throw new HttpError(400, 'Not enough stock available.');
    const cartId = await getCartId(client, req.user.id);
    await client.query(
      `insert into cart_items(cart_id, product_id, quantity) values($1,$2,$3)
       on conflict(cart_id, product_id) do update set quantity=least(cart_items.quantity + excluded.quantity, 20)`,
      [cartId, productId, quantity]
    );
  });
  res.status(201).json({ cart: await readCart(req.user.id) });
}));

cartRouter.patch('/items/:id', validate(z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ quantity: z.number().int().min(1).max(20) })
})), asyncHandler(async (req, res) => {
  const result = await query(
    `update cart_items ci set quantity=$1
     from carts c where ci.cart_id=c.id and c.user_id=$2 and ci.id=$3 returning ci.id`,
    [req.validated.body.quantity, req.user.id, req.validated.params.id]
  );
  if (!result.rowCount) throw new HttpError(404, 'Cart item not found.');
  res.json({ cart: await readCart(req.user.id) });
}));

cartRouter.delete('/items/:id', validate(z.object({
  params: z.object({ id: z.string().uuid() })
})), asyncHandler(async (req, res) => {
  await query(
    `delete from cart_items ci using carts c where ci.cart_id=c.id and c.user_id=$1 and ci.id=$2`,
    [req.user.id, req.validated.params.id]
  );
  res.json({ cart: await readCart(req.user.id) });
}));
