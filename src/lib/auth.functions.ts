import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { z } from 'zod';

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const { getSessionUser } = await import('./session.server');
  return getSessionUser(getRequest());
});

export const login = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ email: z.string().email(), password: z.string().min(6) }).parse(input))
  .handler(async ({ data }) => {
    const { query } = await import('./db.server');
    const { verifyPassword, createWebSession, sessionCookie } = await import('./session.server');
    const rows = await query<{ id: string; email: string; password_hash: string; language: 'pt' | 'en'; blocked: boolean; role: 'admin'|'user' }>(
      `SELECT u.id,u.email,u.password_hash,u.language,u.blocked,
       CASE WHEN EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role='admin') THEN 'admin' ELSE 'user' END role
       FROM users u WHERE u.email=lower($1) LIMIT 1`, [data.email.trim()]);
    const user = rows[0];
    if (!user || !(await verifyPassword(data.password, user.password_hash))) throw new Error('E-mail ou senha inválidos');
    if (user.blocked) throw new Error('Conta bloqueada');
    const token = await createWebSession(user.id);
    await query('UPDATE users SET last_login_at=now(),last_heartbeat_at=now() WHERE id=$1', [user.id]);
    setResponseHeader('Set-Cookie', sessionCookie(token));
    return { user: { id: user.id, email: user.email, language: user.language }, role: user.role };
  });

export const signup = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ email: z.string().email(), password: z.string().min(6).max(128), fullName: z.string().min(2).max(150), whatsapp: z.string().max(40), language: z.enum(['pt','en']), startTrial: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const request = getRequest();
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
    const { query, transaction } = await import('./db.server');
    const { hashPassword, createWebSession, sessionCookie } = await import('./session.server');
    if (ip) {
      const count = await query<{ count: string }>('SELECT count(*)::text count FROM users WHERE registration_ip=$1::inet', [ip]);
      if (Number(count[0]?.count ?? 0) >= 2) throw new Error('Limite de contas por IP atingido');
    }
    const passwordHash = await hashPassword(data.password);
    const accessPassword = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
    const userId = await transaction(async (client) => {
      const inserted = await client.query<{ id: string }>(`INSERT INTO users(email,password_hash,full_name,whatsapp,language,access_password,registration_ip)
        VALUES(lower($1),$2,$3,$4,$5,$6,$7::inet) RETURNING id`, [data.email.trim(),passwordHash,data.fullName,data.whatsapp,data.language,accessPassword,ip]);
      const id = inserted.rows[0]?.id;
      if (!id) throw new Error('Falha ao criar usuário');
      await client.query("INSERT INTO user_roles(user_id,role) VALUES($1,'user')", [id]);
      if (data.startTrial) await client.query("INSERT INTO subscriptions(user_id,type,status,expires_at) VALUES($1,'trial','active',now()+interval '30 minutes')", [id]);
      return id;
    });
    const token = await createWebSession(userId);
    setResponseHeader('Set-Cookie', sessionCookie(token));
    return { user: { id: userId, email: data.email.toLowerCase(), language: data.language }, role: 'user' as const };
  });

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const { revokeWebSession, sessionCookie } = await import('./session.server');
  await revokeWebSession(getRequest());
  setResponseHeader('Set-Cookie', sessionCookie('', true));
  return { ok: true };
});
/**
 * Login vindo da extensão (link "Renovar acesso").
 * Aceita a senha da conta OU o access_password de 8 dígitos.
 */
export const loginFromExtension = createServerFn({ method: 'POST' })
  .inputValidator((input) =>
    z.object({ email: z.string().email(), password: z.string().min(4).max(128) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { query } = await import('./db.server');
    const { verifyPassword, createWebSession, sessionCookie } = await import('./session.server');
    const rows = await query<{
      id: string; email: string; password_hash: string; access_password: string | null; blocked: boolean;
    }>(
      `SELECT id,email,password_hash,access_password,blocked FROM users WHERE email=lower($1) LIMIT 1`,
      [data.email.trim()],
    );
    const user = rows[0];
    if (!user) throw new Error('Conta não encontrada');
    if (user.blocked) throw new Error('Conta bloqueada');

    const supplied = data.password.trim();
    const okAccess =
      !!user.access_password && user.access_password.toUpperCase() === supplied.toUpperCase();
    const okPassword = !okAccess && (await verifyPassword(supplied, user.password_hash));
    if (!okAccess && !okPassword) throw new Error('Credenciais inválidas');

    const token = await createWebSession(user.id);
    await query('UPDATE users SET last_login_at=now() WHERE id=$1', [user.id]);
    setResponseHeader('Set-Cookie', sessionCookie(token));
    return { ok: true as const };
  });
