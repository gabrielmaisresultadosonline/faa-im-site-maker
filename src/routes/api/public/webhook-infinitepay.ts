import { createFileRoute } from '@tanstack/react-router';
import { trackPurchaseEvent } from '@/lib/facebook-pixel.functions';

const INFINITEPAY_HANDLE = 'paguemro';

/**
 * Confirma na API da InfinitePay que o pagamento realmente ocorreu.
 * Nunca confiamos no corpo do webhook (que e publico e forjavel).
 */
async function verifyPaymentWithInfinitePay(params: {
  transactionNsu?: string | undefined;
  orderNsu: string;
  slug?: string | undefined;
}): Promise<boolean> {
  try {
    // Tenta primeiro o endpoint documentado via POST (payment_check)
    const postUrl = "https://api.checkout.infinitepay.io/payment_check";
    const postRes = await fetch(postUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        handle: INFINITEPAY_HANDLE,
        order_nsu: params.orderNsu,
        transaction_nsu: params.transactionNsu,
        slug: params.slug
      })
    });

    if (postRes.ok) {
      const body = (await postRes.json()) as { success?: boolean; paid?: boolean };
      if (body?.success === true && body?.paid === true) return true;
    }

    // Fallback para o endpoint público via GET se o POST falhar
    const getUrl = new URL(
      `https://api.infinitepay.io/invoices/public/checkout/payment_check/${INFINITEPAY_HANDLE}`
    );
    getUrl.searchParams.set('external_order_nsu', params.orderNsu);
    if (params.transactionNsu) getUrl.searchParams.set('transaction_nsu', params.transactionNsu);
    if (params.slug) getUrl.searchParams.set('slug', params.slug);

    const getRes = await fetch(getUrl.toString(), { headers: { Accept: 'application/json' } });
    if (!getRes.ok) return false;
    const getBody = (await getRes.json()) as { success?: boolean; paid?: boolean };
    return getBody?.success === true && getBody?.paid === true;
  } catch (err) {
    console.error('InfinitePay verification failed:', err);
    return false;
  }
}

export const Route = createFileRoute('/api/public/webhook-infinitepay')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = (await request.json()) as Record<string, unknown>;

          const orderNsu = typeof payload['order_nsu'] === 'string' ? payload['order_nsu'] : '';
          const transactionNsu =
            typeof payload['transaction_nsu'] === 'string' ? payload['transaction_nsu'] : undefined;
          const invoiceSlug =
            typeof payload['invoice_slug'] === 'string' ? payload['invoice_slug'] : undefined;

          if (!orderNsu) {
            return new Response('Missing order_nsu', { status: 400 });
          }

          // Usamos o client público (anon) para operações de leitura/escrita permitidas por RLS ou service_role se disponível
          const { supabase } = await import('@/integrations/supabase/client');

          const { data: transaction, error: txError } = await supabase
            .from('infinitepay_transactions')
            .select('*')
            .eq('order_nsu', orderNsu)
            .single();

          if (txError || !transaction) {
            return new Response('Transaction not found', { status: 400 });
          }

          if (transaction.status === 'paid') {
            return new Response('Already processed', { status: 200 });
          }

          const confirmed = await verifyPaymentWithInfinitePay({
            transactionNsu,
            orderNsu,
            slug: invoiceSlug,
          });

          if (!confirmed) {
            return new Response('Payment not confirmed', { status: 400 });
          }

          // Nota: Para webhooks públicos sem autenticação de usuário, precisamos que o banco permita
          // essas operações. Como o supabaseAdmin está falhando por falta de env var,
          // usamos o supabase (anon). Certifique-se que as políticas de RLS permitem
          // ou que os GRANTS estão configurados.
          
          await supabase
            .from('infinitepay_transactions')
            .update({
              status: 'paid',
              transaction_nsu: transactionNsu ?? null,
              invoice_slug: invoiceSlug ?? null,
            })
            .eq('id', transaction.id);

          const planDays = transaction.plan_duration_days;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + planDays);

          const { error: subError } = await supabase
            .from('subscriptions')
            .upsert(
              {
                user_id: transaction.user_id,
                type: planDays >= 365 ? 'annual' : 'paid',
                status: 'active',
                expires_at: expiresAt.toISOString(),
              },
              { onConflict: 'user_id' }
            );

          // Track Purchase event on Facebook Conversion API
          try {
            // Get user email for better matching
            const { data: userData } = await supabase.auth.admin.getUserById(transaction.user_id);
            
            await trackPurchaseEvent({
              data: {
                email: userData?.user?.email,
                value: transaction.amount / 100, // Assuming amount is in cents
                currency: 'BRL',
                userAgent: request.headers.get('user-agent') || ''
              }
            });
          } catch (trackError) {
            console.error('FB Purchase tracking failed:', trackError);
          }

          if (subError) {
            console.error('Error updating subscription', subError);
            return new Response('Subscription update failed', { status: 500 });
          }

          // Track Purchase event on Facebook Conversion API
          try {
            // Get user email for better matching
            const { data: userData } = await supabase.auth.admin.getUserById(transaction.user_id);
            
            await trackPurchaseEvent({
              data: {
                email: userData?.user?.email,
                value: transaction.amount / 100, // Assuming amount is in cents
                currency: 'BRL',
                userAgent: request.headers.get('user-agent') || ''
              }
            });
          } catch (trackError) {
            console.error('FB Purchase tracking failed:', trackError);
          }


          return new Response('OK', { status: 200 });
        } catch (error) {
          console.error('Webhook error');
          return new Response('Internal Error', { status: 500 });
        }
      },
    },
  },
});
