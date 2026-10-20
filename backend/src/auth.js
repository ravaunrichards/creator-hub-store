import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
export const COOKIE_NAME = 'creatorhub_store_session';
const maxAge = 7 * 24 * 60 * 60 * 1000;
export function assertSessionSecret(secret) {
 if (!secret || secret.length < 32 || secret.includes('replace-with-')) throw new Error('SESSION_SECRET must be a unique secret of at least 32 characters.');
}
export const hashPassword = password => bcrypt.hash(password, 12);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
export const issueSession = id => jwt.sign({ sub: id }, process.env.SESSION_SECRET, { expiresIn: '7d' });
export function readSession(token) { try { const p = jwt.verify(token, process.env.SESSION_SECRET); return typeof p.sub === 'string' ? p.sub : null; } catch { return null; } }
export function setSessionCookie(res, token) { res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'strict', path: '/', maxAge }); }
export function clearSessionCookie(res) { res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'strict', path: '/' }); }
