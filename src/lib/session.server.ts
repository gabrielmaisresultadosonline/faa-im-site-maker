import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from './db.server';

export interface SessionUser { id: string; email: string; full_name: string; language: 'pt' | 'en'; role: 'admin' | 'user' }
const COOKIE = 'lovablack_session';
const SESSION_DAYS = 30;

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

function cookieValue(request: globalThis.Request, name: string): string | null {
  const entry = (request.headers.get('cookie') ?? '').split(';').map((v) => v.trim()).find((v) => v.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

export function sessionCookie(token: string, clear = false): string {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  const age = clear ? 0 : SESSION_DAYS * 86400;
  return `${COOKIE}=${clear ? '' : encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure}`;
}

export async function createWebSession(userId: string): Promise<string> {
  const token = newToken();
  await query('INSERT INTO web_sessions(user_id, token_hash, expires_at) VALUES ($1,$2,now() + interval \'30 days\')', [userId, hashToken(token)]);
  return token;
}

export async function getSessionUser(request: globalThis.Request): Promise<SessionUser | null> {
  const token = cookieValue(request, COOKIE);
  if (!token) return null;
  const rows = await query<SessionUser>(`SELECT u.id,u.email,u.full_name,u.language,coalesce(r.role,'user') role
    FROM web_sessions s JOIN users u ON u.id=s.user_id
    LEFT JOIN user_roles r ON r.user_id=u.id AND r.role='admin'
    WHERE s.token_hash=$1 AND s.expires_at>now() AND NOT u.blocked LIMIT 1`, [hashToken(token)]);
  if (rows[0]) await query('UPDATE web_sessions SET last_seen_at=now() WHERE token_hash=$1', [hashToken(token)]);
  return rows[0] ?? null;
}

export async function requireSessionUser(request: globalThis.Request): Promise<SessionUser> {
  const user = await getSessionUser(request);
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export async function requireAdmin(request: globalThis.Request): Promise<SessionUser> {
  const user = await requireSessionUser(request);
  if (user.role !== 'admin') throw new Error('FORBIDDEN');
  return user;
}

export async function revokeWebSession(request: globalThis.Request): Promise<void> {
  const token = cookieValue(request, COOKIE);
  if (token) await query('DELETE FROM web_sessions WHERE token_hash=$1', [hashToken(token)]);
}
