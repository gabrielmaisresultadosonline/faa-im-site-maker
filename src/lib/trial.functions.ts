import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

export const startTrial = createServerFn({ method: 'POST' }).handler(async () => {
  const { requireSessionUser } = await import('./session.server');
  const { transaction } = await import('./db.server');
  const user = await requireSessionUser(getRequest());
  return transaction(async (client) => {
    const current = await client.query<{ type: string; status: string; expires_at: Date | null }>(
      'SELECT type,status,expires_at FROM subscriptions WHERE user_id=$1 FOR UPDATE', [user.id]);
    const existing = current.rows[0];
    if (existing?.type === 'trial') throw new Error('TRIAL_ALREADY_USED');
    if (existing?.status === 'active' && (!existing.expires_at || existing.expires_at.getTime() > Date.now())) throw new Error('ACTIVE_PAID_PLAN');
    if (existing) throw new Error('TRIAL_NOT_AVAILABLE');
    const inserted = await client.query<{ expires_at: Date }>("INSERT INTO subscriptions(user_id,type,status,expires_at) VALUES($1,'trial','active',now()+interval '20 minutes') RETURNING expires_at", [user.id]);
    const access = await client.query<{ access_password: string }>('SELECT access_password FROM users WHERE id=$1', [user.id]);
    return { expiresAt: inserted.rows[0]?.expires_at.toISOString() ?? '', accessPassword: access.rows[0]?.access_password ?? '' };
  });
});
