import { adminData, uploadAsset } from './admin-data.functions';
import { getCurrentUser, login, logout, signup } from './auth.functions';

type Result<T> = { data: T; error: { message: string } | null };

class QueryBuilder implements PromiseLike<Result<Record<string, unknown>[]>> {
  private filters: Record<string, string> = {};
  private ordering?: { column: string; ascending: boolean };
  constructor(private table: 'subscriptions'|'transactions'|'app_settings'|'extension_notices'|'extension_docs', private action: 'select'|'insert'|'update'|'delete' = 'select', private values?: Record<string, unknown>) {}
  select(_columns = '*') { return this; }
  eq(column: string, value: unknown) { this.filters[column] = String(value); return this; }
  order(column: string, options?: { ascending?: boolean }) { this.ordering = { column, ascending: options?.ascending ?? true }; return this; }
  insert(value: Record<string, unknown> | Record<string, unknown>[]) { this.action = 'insert'; this.values = Array.isArray(value) ? value[0] : value; return this; }
  update(value: Record<string, unknown>) { this.action = 'update'; this.values = value; return this; }
  delete() { this.action = 'delete'; return this; }
  then<TResult1 = Result<Record<string, unknown>[]>, TResult2 = never>(resolve?: ((value: Result<Record<string, unknown>[]>) => TResult1 | PromiseLike<TResult1>) | null, reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) {
    return adminData({ data: { table: this.table, action: this.action, values: this.values, filters: this.filters, order: this.ordering } })
      .then((data) => ({ data, error: null }), (error: Error) => ({ data: [], error: { message: error.message } })).then(resolve, reject);
  }
}

export const postgresClient = {
  auth: {
    getUser: async () => { try { const user = await getCurrentUser(); return { data: { user }, error: null }; } catch (e) { return { data: { user: null }, error: e as Error }; } },
    signInWithPassword: async (input: { email: string; password: string }) => { try { const result = await login({ data: input }); return { data: { user: result.user, session: result }, error: null }; } catch (e) { return { data: { user: null, session: null }, error: e as Error }; } },
    signUp: async (input: { email: string; password: string; options?: { data?: Record<string, string> } }) => { try { const meta = input.options?.data ?? {}; const result = await signup({ data: { email: input.email, password: input.password, fullName: meta['full_name'] ?? '', whatsapp: meta['whatsapp'] ?? '', language: meta['language'] === 'en' ? 'en' : 'pt', startTrial: meta['is_trial'] === 'true' } }); return { data: { user: result.user, session: result }, error: null }; } catch (e) { return { data: { user: null, session: null }, error: e as Error }; } },
    signOut: async () => { await logout(); return { error: null }; },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  from: (table: 'subscriptions'|'transactions'|'app_settings'|'extension_notices'|'extension_docs') => new QueryBuilder(table),
  storage: { from: (_bucket: string) => ({
    upload: async (_path: string, file: File) => { try { const form = new FormData(); form.set('file', file); const result = await uploadAsset({ data: form }); return { data: result, error: null }; } catch (e) { return { data: null, error: e as Error }; } },
    createSignedUrl: async (path: string) => ({ data: { signedUrl: `/api/media/${encodeURIComponent(path.split('/').at(-1) ?? '')}` }, error: null }),
  }) },
};
