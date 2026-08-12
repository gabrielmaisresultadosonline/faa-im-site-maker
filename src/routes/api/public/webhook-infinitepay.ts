import { createFileRoute } from '@tanstack/react-router';

const INFINITEPAY_HANDLE = 'paguemro';

/**
 * Confirma na API da InfinitePay que o pagamento realmente ocorreu.
 * Nunca confiamos no corpo do webhook (que e publico e forjavel).
 */
async function verifyPaymentWithInfinitePay(params: {
  transactionNsu?: string;
  orderNsu: string;
  slug?: string;
}): Promise<boolean> {
  try {
    const url = new URL(
      `https://api.infinitepay.io/invoices/public/checkout/payment_check/${INFINITEPAY_HANDLE}`
    );
    url.searchParams.set('external_order_nsu', params.orderNsu);
    if (params.transactionNsu) url.searchParams.set('transaction_nsu', params.transactionNsu);
    if (params.slug) url.searchParams.set('slug', params.slug);

    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) return false;
    const body = (await res.json()) as { success?: boolean; paid?: boolean };
    return body?.success === true && body?.paid === true;
  } catch (err) {
    console.error('InfinitePay verification failed');
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

          const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

          const { data: transaction, error: txError } = await supabaseAdmin
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

          // Verificacao obrigatoria server-to-server: sem isso, qualquer POST forjado
          // ativaria uma assinatura paga.
          const confirmed = await verifyPaymentWithInfinitePay({
            transactionNsu,
            orderNsu,
            slug: invoiceSlug,
          });

          if (!confirmed) {
            return new Response('Payment not confirmed', { status: 400 });
          }

          await supabaseAdmin
            .from('infinitepay_transactions')
            .update({
              status: 'paid',
              transaction_nsu: transactionNsu ?? null,
              invoice_slug: invoiceSlug ?? null,
            })
            .eq('id', transaction.id);

          // Duracao vem SEMPRE da transacao gravada no servidor, nunca do webhook.
          const planDays = transaction.plan_duration_days;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + planDays);

          const { error: subError } = await supabaseAdmin
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

          if (subError) {
            console.error('Error updating subscription');
            return new Response('Subscription update failed', { status: 500 });
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
