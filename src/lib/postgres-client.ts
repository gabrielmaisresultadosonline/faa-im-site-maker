import { adminData, uploadAsset } from './admin-data.functions';
import { getCurrentUser, login, logout, signup } from './auth.functions';

type Result<T> = { data: T; error: { message: string } | null };
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
interface AppRow {
  id: string; user_id: string; key: string; value: JsonValue; type: string; status: string;
  expires_at: string; created_at: string; updated_at: string; amount: number; plan_name: string;
  order_nsu: string; provider: string; currency: string; payment_link: string;
  extension_id: string; notice_type: string; content_type: string; content: string;
  image_thumb_url: string; is_active: boolean; title: string;
}

class QueryBuilder implements PromiseLike<Result<AppRow[]>> {
  private filters: Record<string, string> = {};
  private ordering?: { column: string; ascending: boolean };
  constructor(private table: 'subscriptions'|'transactions'|'app_settings'|'extension_notices'|'extension_docs', private action: 'select'|'insert'|'update'|'delete' = 'select', private values?: Record<string, unknown>) {}
  select(_columns = '*') { return this; }
  eq(column: string, value: unknown) { this.filters[column] = String(value); return this; }
  order(column: string, options?: { ascending?: boolean }) { this.ordering = { column, ascending: options?.ascending ?? true }; return this; }
  insert(value: Record<string, unknown> | Record<string, unknown>[]) { this.action = 'insert'; this.values = Array.isArray(value) ? value[0] : value; return this; }
  update(value: Record<string, unknown>) { this.action = 'update'; this.values = value; return this; }
  delete() { this.action = 'delete'; return this; }
  then<TResult1 = Result<AppRow[]>, TResult2 = never>(resolve?: ((value: Result<AppRow[]>) => TResult1 | PromiseLike<TResult1>) | null, reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) {
    return adminData({ data: { table: this.table, action: this.action, values: this.values, filters: this.filters, order: this.ordering } })
      .then((data) => ({ data: data as unknown as AppRow[], error: null }), (error: Error) => ({ data: [] as AppRow[], error: { message: error.message } })).then(resolve, reject);
  }
}

export const postgresClient = {
  auth: {
    getUser: async () => { try { const user = await getCurrentUser(); return { data: { user }, error: null }; } catch (e) { return { data: { user: null }, error: e as Error }; } },
    signInWithPassword: async (input: { email: string; password: string }) => { try { const result = await login({ data: input }); return { data: { user: result.user, session: result }, error: null }; } catch (e) { return { data: { user: null, session: null }, error: e as Error }; } },
    signUp: async (input: { email: string; password: string; options?: { data?: Record<string, string> } }) => { try { const meta = input.options?.data ?? {}; const result = await signup({ data: { email: input.email, password: input.password, fullName: meta['full_name'] ?? '', whatsapp: meta['whatsapp'] ?? '', language: meta['language'] === 'en' ? 'en' : 'pt', startTrial: meta['is_trial'] === 'true' } }); return { data: { user: result.user, session: { ...result, role: result.role as 'admin' | 'user' } }, error: null }; } catch (e) { return { data: { user: null, session: null }, error: e as Error }; } },
    signOut: async () => { await logout(); return { error: null }; },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  from: (table: 'subscriptions'|'transactions'|'infinitepay_transactions'|'app_settings'|'extension_notices'|'extension_docs') => new QueryBuilder(table === 'infinitepay_transactions' ? 'transactions' : table),
  storage: { from: (_bucket: string) => ({
    upload: async (_path: string, file: File, _options?: { cacheControl?: string; upsert?: boolean; contentType?: string }) => { try { const form = new FormData(); form.set('file', file); const result = await uploadAsset({ data: form }); return { data: result, error: null }; } catch (e) { return { data: null, error: e as Error }; } },
    createSignedUrl: async (path: string, _expires?: number, _options?: { download?: boolean }) => ({ data: { signedUrl: `/api/media/${encodeURIComponent(path.split('/').at(-1) ?? '')}` }, error: null }),
  }) },
};
