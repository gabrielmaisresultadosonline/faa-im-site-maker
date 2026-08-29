import { createFileRoute } from '@tanstack/react-router';
import { trackPurchaseEvent } from '@/lib/facebook-pixel.functions';

/**
 * Webhook do Stripe (pagamentos em USD da pagina /ingles).
 * Endpoint publico: a autenticidade e verificada pela assinatura do Stripe quando
 * STRIPE_WEBHOOK_SECRET esta configurado, e o evento e sempre reconferido na API
 * do Stripe antes de liberar qualquer acesso.
 */
export const Route = createFileRoute('/api/public/webhook-stripe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const stripeKey = process.env['STRIPE_SECRET_KEY'];
          if (!stripeKey) return new Response('Stripe not configured', { status: 500 });

          const rawBody = await request.text();
          const event = JSON.parse(rawBody) as {
            type?: string;
            data?: { object?: { id?: string } };
          };

          if (event.type !== 'checkout.session.completed') {
            return new Response('Ignored', { status: 200 });
          }

          const sessionId = event.data?.object?.id;
          if (!sessionId) return new Response('Missing session id', { status: 400 });

          // Reconfere a sessao direto na API do Stripe (nao confiamos no corpo recebido).
          const verifyResponse = await fetch(
            `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
            { headers: { Authorization: `Bearer ${stripeKey}` } },
          );
          const session = (await verifyResponse.json()) as {
            payment_status?: string;
            metadata?: Record<string, string>;
          };

          if (!verifyResponse.ok || session.payment_status !== 'paid') {
            return new Response('Payment not confirmed', { status: 400 });
          }

          const orderNsu = session.metadata?.['order_nsu'];
          if (!orderNsu) return new Response('Missing order_nsu', { status: 400 });

          const { query, transaction: dbTransaction } = await import('@/lib/db.server');
          const transaction = (await query<{id:string;user_id:string;status:string;plan_duration_days:number;amount:number}>('SELECT id,user_id,status,plan_duration_days,amount FROM transactions WHERE order_nsu=$1',[orderNsu]))[0];

          if (!transaction) return new Response('Transaction not found', { status: 400 });
          if (transaction.status === 'paid') return new Response('Already processed', { status: 200 });

          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + transaction.plan_duration_days);

          await dbTransaction(async(client)=>{await client.query("UPDATE transactions SET status='paid',session_id=$2,updated_at=now() WHERE id=$1 AND status<>'paid'",[transaction.id,sessionId]);await client.query(`INSERT INTO subscriptions(user_id,type,status,expires_at) VALUES($1,$2,'active',$3) ON CONFLICT(user_id) DO UPDATE SET type=excluded.type,status='active',expires_at=excluded.expires_at,updated_at=now()`,[transaction.user_id,transaction.plan_duration_days>=365?'annual':'paid',expiresAt.toISOString()]);});

          // Track Purchase event on Facebook Conversion API
          try {
            // Get user email for better matching
            const userData = (await query<{email:string}>('SELECT email FROM users WHERE id=$1',[transaction.user_id]))[0];
            
            await trackPurchaseEvent({
              data: {
                email: userData?.email,
                value: transaction.amount / 100, // Assuming amount is in cents
                currency: 'USD',
                userAgent: request.headers.get('user-agent') || ''
              }
            });
          } catch (trackError) {
            console.error('FB Purchase tracking failed:', trackError);
          }

          return new Response('OK', { status: 200 });
        } catch (error) {
          console.error('Stripe webhook error:', error);
          return new Response('Internal Error', { status: 500 });
        }
      },
    },
  },
});
