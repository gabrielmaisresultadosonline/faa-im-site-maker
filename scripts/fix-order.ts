import { supabaseAdmin } from './integrations/supabase/client.server';

async function approveOrder() {
  const orderNsu = 'order-1787000387867-97f26aa6-95d2-4d62-a6f4-da7245c9f7c2';
  
  console.log(`Buscando transação: ${orderNsu}`);
  
  const { data: transaction, error: txError } = await supabaseAdmin
    .from('infinitepay_transactions')
    .select('*')
    .eq('order_nsu', orderNsu)
    .single();

  if (txError || !transaction) {
    console.error('Erro ao buscar transação:', txError);
    return;
  }

  console.log('Transação encontrada. Atualizando para pago...');

  const { error: updateError } = await supabaseAdmin
    .from('infinitepay_transactions')
    .update({ status: 'paid' })
    .eq('id', transaction.id);

  if (updateError) {
    console.error('Erro ao atualizar transação:', updateError);
    return;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (transaction.plan_duration_days || 30));

  console.log(`Atualizando assinatura para o usuário ${transaction.user_id}...`);

  const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: transaction.user_id,
      type: transaction.plan_duration_days >= 365 ? 'annual' : 'paid',
      status: 'active',
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (subError) {
    console.error('Erro ao atualizar assinatura:', subError);
    return;
  }

  console.log('✅ Pedido aprovado com sucesso!');
}

approveOrder().catch(console.error);
