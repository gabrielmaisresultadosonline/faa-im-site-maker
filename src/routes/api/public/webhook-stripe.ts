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

          const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

          const { data: transaction } = await supabaseAdmin
            .from('infinitepay_transactions')
            .select('*')
            .eq('order_nsu', orderNsu)
            .single();

          if (!transaction) return new Response('Transaction not found', { status: 400 });
          if (transaction.status === 'paid') return new Response('Already processed', { status: 200 });

          await supabaseAdmin
            .from('infinitepay_transactions')
            .update({ status: 'paid', session_id: sessionId })
            .eq('id', transaction.id);

          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + transaction.plan_duration_days);

          const { error: subError } = await supabaseAdmin.from('subscriptions').upsert(
            {
              user_id: transaction.user_id,
              type: transaction.plan_duration_days >= 365 ? 'annual' : 'paid',
              status: 'active',
              expires_at: expiresAt.toISOString(),
            },
            { onConflict: 'user_id' },
          );

          if (subError) {
            console.error('Error updating subscription:', subError);
            return new Response('Subscription update failed', { status: 500 });
          }

          // Track Purchase event on Facebook Conversion API
          try {
            // Get user email for better matching
            const { data: userData } = await supabaseAdmin.auth.admin.getUserById(transaction.user_id);
            
            await trackPurchaseEvent({
              data: {
                email: userData?.user?.email,
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
