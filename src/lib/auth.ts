import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

export const getProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireSessionUser } = await import('./session.server');
  const { query } = await import('./db.server');
  const user = await requireSessionUser(getRequest());
  const rows = await query<Record<string, unknown>>(`SELECT id,email,full_name,whatsapp,language,access_password,
    blocked,custom_message,last_login_at,last_heartbeat_at,registration_ip,created_at FROM users WHERE id=$1`, [user.id]);
  return rows[0] ?? null;
});

export const getSubscriptionStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireSessionUser } = await import('./session.server');
  const { query } = await import('./db.server');
  const user = await requireSessionUser(getRequest());
  const rows = await query<Record<string, unknown> & { expires_at: string | null; status: string }>(
    'SELECT * FROM subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [user.id]);
  const subscription = rows[0];
  if (!subscription) return null;
  const expiry = subscription.expires_at ? new Date(subscription.expires_at).getTime() : Number.POSITIVE_INFINITY;
  return { ...subscription, isExpired: subscription.status !== 'active' || expiry + 300_000 <= Date.now() };
});

export const getAppSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const { query } = await import('./db.server');
  const rows = await query<{ key: string; value: unknown }>('SELECT key,value FROM app_settings');
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
});

export const isAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const { getSessionUser } = await import('./session.server');
  return (await getSessionUser(getRequest()))?.role === 'admin';
});
