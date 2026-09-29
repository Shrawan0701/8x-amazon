import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, setAuthCookie, signToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { sendPasswordResetEmail } from '../services/email.js';

export const authRouter = express.Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const passwordSchema = z.string()
  .min(6, 'Password must be at least 6 characters.')
  .max(128, 'Password must be 128 characters or fewer.');

const signupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
    email: z.string().trim().email('Enter a valid email address.').toLowerCase(),
    password: passwordSchema,
    confirmPassword: passwordSchema
  })
}).refine((data) => data.body.password === data.body.confirmPassword, {
  path: ['body', 'confirmPassword'],
  message: 'Passwords must match.'
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(1)
  })
});

authRouter.post('/signup', authLimiter, validate(signupSchema), asyncHandler(async (req, res) => {
  const { name, email, password } = req.validated.body;
  const existing = await query('select id from users where email=$1', [email]);
  if (existing.rowCount) throw new HttpError(409, 'An account with that email already exists.');
  const passwordHash = await bcrypt.hash(password, 12);
  const { rows } = await query(
    'insert into users(name, email, password_hash) values($1,$2,$3) returning id, name, email, created_at',
    [name, email, passwordHash]
  );
  const token = signToken(rows[0]);
  setAuthCookie(res, token);
  res.status(201).json({ user: rows[0] });
}));

authRouter.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const { rows } = await query('select id, name, email, password_hash, created_at from users where email=$1', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Invalid email or password.');
  }
  const token = signToken(user);
  setAuthCookie(res, token);
  delete user.password_hash;
  res.json({ user });
}));

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.post('/forgot-password', otpLimiter, validate(z.object({
  body: z.object({ email: z.string().trim().email().toLowerCase() })
})), asyncHandler(async (req, res) => {
  const { email } = req.validated.body;
  const { rows } = await query('select id, name, email from users where email=$1', [email]);
  if (rows[0]) {
    const otp = String(crypto.randomInt(100000, 999999));
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    await query('insert into password_reset_otps(user_id, otp_hash, expires_at) values($1,$2,now() + interval \'10 minutes\')', [rows[0].id, otpHash]);
    await sendPasswordResetEmail(rows[0], otp);
  }
  res.json({ message: 'If that email exists, a reset OTP has been sent.' });
}));

authRouter.post('/verify-reset-otp', otpLimiter, validate(z.object({
  body: z.object({
    email: z.string().trim().email().toLowerCase(),
    otp: z.string().regex(/^\d{6}$/)
  })
})), asyncHandler(async (req, res) => {
  const { email, otp } = req.validated.body;
  const { rows } = await query(
    `select o.id, o.otp_hash, o.attempts, o.expires_at from password_reset_otps o
     join users u on u.id=o.user_id
     where u.email=$1 and o.used_at is null
     order by o.created_at desc limit 1`,
    [email]
  );
  const reset = rows[0];
  if (!reset || new Date(reset.expires_at) < new Date() || reset.attempts >= 5) {
    throw new HttpError(400, 'OTP is invalid or expired.');
  }
  const hash = crypto.createHash('sha256').update(otp).digest('hex');
  if (hash !== reset.otp_hash) {
    await query('update password_reset_otps set attempts=attempts+1 where id=$1', [reset.id]);
    throw new HttpError(400, 'OTP is invalid or expired.');
  }
  res.json({ message: 'OTP verified.' });
}));

authRouter.post('/reset-password', otpLimiter, validate(z.object({
  body: z.object({
    email: z.string().trim().email().toLowerCase(),
    otp: z.string().regex(/^\d{6}$/),
    password: passwordSchema
  })
})), asyncHandler(async (req, res) => {
  const { email, otp, password } = req.validated.body;
  const { rows } = await query(
    `select o.id, o.otp_hash, o.attempts, o.expires_at, u.id as user_id
     from password_reset_otps o join users u on u.id=o.user_id
     where u.email=$1 and o.used_at is null
     order by o.created_at desc limit 1`,
    [email]
  );
  const reset = rows[0];
  const hash = crypto.createHash('sha256').update(otp).digest('hex');
  if (!reset || new Date(reset.expires_at) < new Date() || reset.attempts >= 5 || hash !== reset.otp_hash) {
    if (reset) await query('update password_reset_otps set attempts=attempts+1 where id=$1', [reset.id]);
    throw new HttpError(400, 'OTP is invalid or expired.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await query('update users set password_hash=$1 where id=$2', [passwordHash, reset.user_id]);
  await query('update password_reset_otps set used_at=now() where id=$1', [reset.id]);
  res.json({ message: 'Password reset successful. You can log in now.' });
}));
