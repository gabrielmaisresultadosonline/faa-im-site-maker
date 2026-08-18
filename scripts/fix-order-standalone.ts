import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

  console.log(`Transação encontrada (Plano: ${transaction.plan_name}). Atualizando para pago...`);

  const { error: updateError } = await supabaseAdmin
    .from('infinitepay_transactions')
    .update({ status: 'paid' })
    .eq('id', transaction.id);

  if (updateError) {
    console.error('Erro ao atualizar transação:', updateError);
    return;
  }

  // Mapeamento correto para o check constraint da tabela subscriptions
  let subType = 'monthly';
  if (transaction.plan_duration_days >= 365 || transaction.plan_name === 'Anual') {
    subType = 'annual';
  } else if (transaction.plan_duration_days >= 180 || transaction.plan_name === 'Semestral') {
    subType = 'semiannual';
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (transaction.plan_duration_days || 30));

  console.log(`Atualizando assinatura para o usuário ${transaction.user_id} (Tipo: ${subType})...`);

  const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: transaction.user_id,
      type: subType,
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
