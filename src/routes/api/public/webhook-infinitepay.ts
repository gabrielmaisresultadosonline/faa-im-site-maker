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

          const { query, transaction: dbTransaction } = await import('@/lib/db.server');
          const transaction = (await query<{id:string;user_id:string;status:string;plan_duration_days:number;amount:number}>('SELECT id,user_id,status,plan_duration_days,amount FROM transactions WHERE order_nsu=$1',[orderNsu]))[0];

          if (!transaction) {
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

          const planDays = transaction.plan_duration_days;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + planDays);

          await dbTransaction(async(client)=>{ await client.query("UPDATE transactions SET status='paid',transaction_nsu=$2,invoice_slug=$3,updated_at=now() WHERE id=$1 AND status<>'paid'",[transaction.id,transactionNsu??null,invoiceSlug??null]); await client.query(`INSERT INTO subscriptions(user_id,type,status,expires_at) VALUES($1,$2,'active',$3) ON CONFLICT(user_id) DO UPDATE SET type=excluded.type,status='active',expires_at=excluded.expires_at,updated_at=now()`,[transaction.user_id,planDays>=365?'annual':planDays>=180?'semiannual':'monthly',expiresAt.toISOString()]); });

          // Track Purchase event on Facebook Conversion API
          try {
            // Get user email for better matching
            const userData = (await query<{email:string}>('SELECT email FROM users WHERE id=$1',[transaction.user_id]))[0];
            
            await trackPurchaseEvent({
              data: {
                email: userData?.email,
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
