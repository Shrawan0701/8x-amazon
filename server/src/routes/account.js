import express from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../utils/http.js';

export const accountRouter = express.Router();

const addressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(7),
  line1: z.string().min(3),
  line2: z.string().optional().default(''),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(4),
  country: z.string().min(2).default('India'),
  isDefault: z.boolean().optional().default(false)
});

function selectAddresses(userId) {
  return query(
    `select id, full_name, phone, line1, line2, city, state, postal_code, country, is_default, created_at
     from addresses
     where user_id=$1
     order by is_default desc, created_at desc`,
    [userId]
  );
}

async function normalizeDefaultAddress(client, userId, addressId, wantsDefault) {
  const { rows } = await client.query('select count(*)::int as count from addresses where user_id=$1', [userId]);
  const shouldDefault = wantsDefault || rows[0].count === 1;
  if (shouldDefault) {
    await client.query('update addresses set is_default=false where user_id=$1', [userId]);
    await client.query('update addresses set is_default=true where id=$1 and user_id=$2', [addressId, userId]);
  } else {
    const defaults = await client.query('select id from addresses where user_id=$1 and is_default=true limit 1', [userId]);
    if (!defaults.rowCount) {
      await client.query(
        `update addresses set is_default=true
         where id=(select id from addresses where user_id=$1 order by created_at desc limit 1)`,
        [userId]
      );
    }
  }
}

accountRouter.get('/profile', requireAuth, asyncHandler(async (req, res) => {
  const user = await query('select id, name, email, created_at from users where id=$1', [req.user.id]);
  const addresses = await selectAddresses(req.user.id);
  res.json({ user: user.rows[0], addresses: addresses.rows });
}));

accountRouter.patch('/profile', requireAuth, validate(z.object({
  body: z.object({ name: z.string().min(2).max(120) })
})), asyncHandler(async (req, res) => {
  const updated = await query(
    'update users set name=$1 where id=$2 returning id, name, email, created_at',
    [req.validated.body.name.trim(), req.user.id]
  );
  res.json({ user: updated.rows[0] });
}));

accountRouter.post('/addresses', requireAuth, validate(z.object({ body: addressSchema })), asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const result = await withTransaction(async (client) => {
    const inserted = await client.query(
      `insert into addresses(user_id, full_name, phone, line1, line2, city, state, postal_code, country, is_default)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,false) returning id`,
      [req.user.id, body.fullName, body.phone, body.line1, body.line2, body.city, body.state, body.postalCode, body.country]
    );
    await normalizeDefaultAddress(client, req.user.id, inserted.rows[0].id, body.isDefault);
    const addresses = await client.query(
      `select id, full_name, phone, line1, line2, city, state, postal_code, country, is_default, created_at
       from addresses where user_id=$1 order by is_default desc, created_at desc`,
      [req.user.id]
    );
    return addresses.rows;
  });
  res.status(201).json({ addresses: result });
}));

accountRouter.patch('/addresses/:id', requireAuth, validate(z.object({
  params: z.object({ id: z.string().uuid() }),
  body: addressSchema.partial().extend({ isDefault: z.boolean().optional() })
})), asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const result = await withTransaction(async (client) => {
    const existing = await client.query('select id from addresses where id=$1 and user_id=$2', [req.validated.params.id, req.user.id]);
    if (!existing.rowCount) throw new HttpError(404, 'Address not found.');
    await client.query(
      `update addresses set
        full_name=coalesce($1, full_name),
        phone=coalesce($2, phone),
        line1=coalesce($3, line1),
        line2=coalesce($4, line2),
        city=coalesce($5, city),
        state=coalesce($6, state),
        postal_code=coalesce($7, postal_code),
        country=coalesce($8, country)
       where id=$9 and user_id=$10`,
      [body.fullName, body.phone, body.line1, body.line2, body.city, body.state, body.postalCode, body.country, req.validated.params.id, req.user.id]
    );
    await normalizeDefaultAddress(client, req.user.id, req.validated.params.id, Boolean(body.isDefault));
    const addresses = await client.query(
      `select id, full_name, phone, line1, line2, city, state, postal_code, country, is_default, created_at
       from addresses where user_id=$1 order by is_default desc, created_at desc`,
      [req.user.id]
    );
    return addresses.rows;
  });
  res.json({ addresses: result });
}));

accountRouter.delete('/addresses/:id', requireAuth, validate(z.object({
  params: z.object({ id: z.string().uuid() })
})), asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    const deleted = await client.query('delete from addresses where id=$1 and user_id=$2 returning is_default', [req.validated.params.id, req.user.id]);
    if (!deleted.rowCount) throw new HttpError(404, 'Address not found.');
    if (deleted.rows[0].is_default) {
      await client.query(
        `update addresses set is_default=true
         where id=(select id from addresses where user_id=$1 order by created_at desc limit 1)`,
        [req.user.id]
      );
    }
    const addresses = await client.query(
      `select id, full_name, phone, line1, line2, city, state, postal_code, country, is_default, created_at
       from addresses where user_id=$1 order by is_default desc, created_at desc`,
      [req.user.id]
    );
    return addresses.rows;
  });
  res.json({ addresses: result });
}));
