import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { HttpError } from '../utils/http.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: '7d' });
}

export function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'none',
    secure: config.nodeEnv === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

export async function attachUser(req, _res, next) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return next();
    const payload = jwt.verify(token, config.jwtSecret);
    const { rows } = await query('select id, name, email, created_at from users where id = $1', [payload.sub]);
    req.user = rows[0] || null;
    return next();
  } catch {
    return next();
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Please log in to continue.'));
  return next();
}
