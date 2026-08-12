import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, CreditCard, Clock, CheckCircle, XCircle, Download, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const queryClient = useQueryClient();
  
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data: subs, error } = await supabase.from('subscriptions').select('*, profiles(*)');
      if (error) throw error;
      
      const total = subs.length;
      const active = subs.filter(s => s.status === 'active' && new Date(s.expires_at) > new Date()).length;
      const expired = total - active;
      const trials = subs.filter(s => s.type === 'trial').length;
      
      return { total, active, expired, trials, subs };
    }
  });

  const { data: transactions } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('infinitepay_transactions')
        .select('*, profiles:user_id(full_name, whatsapp, language)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (error) throw error;
      const s: Record<string, any> = {};
      data.forEach(item => s[item.key] = item.value);
      return s;
    }
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: any }) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ value })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success("Configuração atualizada!");
    }
  });

  return (
    <div className="min-h-screen bg-[#F7F1EB] p-4 md:p-8 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-[#1A1B1A]">Painel Administrativo</h1>
          <p className="text-neutral-500">Gestão Total LOVABLACK</p>
        </header>

        {/* Settings Area */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-neutral-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" /> Download da Extensão
              </CardTitle>
              <CardDescription>Link do arquivo .zip para os membros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  key={settings?.['download_link'] || 'dl-empty'}
                  defaultValue={settings?.['download_link']} 
                  id="download-link-input"
                  placeholder="https://..." 
                />
                <Button onClick={() => {
                  const val = (document.getElementById('download-link-input') as HTMLInputElement).value;
                  updateSettingMutation.mutate({ key: 'download_link', value: val });
                }}>Salvar</Button>
              </div>
            </CardContent>

          </Card>

          <Card className="bg-white border-neutral-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" /> Vídeos Tutoriais
              </CardTitle>
              <CardDescription>Gerencie os vídeos da área de membros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(settings?.['tutorials'] || []).map((tut: any, index: number) => (
                <div key={index} className="flex flex-col gap-2 p-3 border rounded-lg bg-neutral-50">
                  <Input 
                    placeholder="Título do Vídeo" 
                    defaultValue={tut.title}
                    onBlur={(e) => {
                      if (!settings) return;
                      const newTuts = [...(settings['tutorials'] || [])];
                      newTuts[index].title = e.target.value;
                      updateSettingMutation.mutate({ key: 'tutorials', value: newTuts });
                    }}
                  />
                  <div className="flex gap-2">
                    <Input 
                      placeholder="URL Embed YouTube" 
                      defaultValue={tut.url}
                      onBlur={(e) => {
                        if (!settings) return;
                        const newTuts = [...(settings['tutorials'] || [])];
                        newTuts[index].url = e.target.value;
                        updateSettingMutation.mutate({ key: 'tutorials', value: newTuts });
                      }}
                    />
                    <Button variant="destructive" size="icon" onClick={() => {
                      if (!settings) return;
                      const newTuts = settings['tutorials'].filter((_: any, i: number) => i !== index);
                      updateSettingMutation.mutate({ key: 'tutorials', value: newTuts });
                    }}><XCircle className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={() => {
                const newTuts = [...(settings?.['tutorials'] || []), { title: 'Novo Vídeo', url: '' }];
                updateSettingMutation.mutate({ key: 'tutorials', value: newTuts });
              }}>+ Adicionar Vídeo</Button>
            </CardContent>

          </Card>

        </section>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Registros" value={stats?.total || 0} />
          <StatCard icon={CheckCircle} label="Assinaturas Ativas" value={stats?.active || 0} color="text-green-600" />
          <StatCard icon={XCircle} label="Expirados" value={stats?.expired || 0} color="text-red-600" />
          <StatCard icon={Clock} label="Testes (Trials)" value={stats?.trials || 0} color="text-blue-600" />
        </div>

        {/* Transactions */}
        <Card className="bg-white border-neutral-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Vendas (InfinitePay R$ + Stripe US$)
            </CardTitle>
            <CardDescription>Acompanhamento de links e pagamentos em tempo real, nos dois idiomas</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Idioma</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>NSU Pedido</TableHead>
                  <TableHead>Checkout</TableHead>

                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="font-bold">{tx.profiles?.full_name || 'Usuário'}</div>
                      <div className="text-xs text-neutral-400">{tx.profiles?.whatsapp}</div>
                    </TableCell>
                    <TableCell><LangTag lang={tx.profiles?.language} /></TableCell>
                    <TableCell>
                      <Badge className={tx.provider === 'stripe' ? 'bg-indigo-100 text-indigo-800' : 'bg-neutral-100 text-neutral-800'}>
                        {tx.provider === 'stripe' ? 'Stripe' : 'InfinitePay'}
                      </Badge>
                    </TableCell>
                    <TableCell>{tx.plan_name}</TableCell>
                    <TableCell>
                      {tx.currency === 'USD' ? 'US$ ' : 'R$ '}
                      {(tx.amount / 100).toFixed(2)}
                    </TableCell>

                    <TableCell>
                      <Badge className={tx.status === 'paid' ? 'bg-green-100 text-green-800' : tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                        {tx.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{tx.order_nsu}</TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" onClick={() => window.open(tx.payment_link, '_blank')}>Abrir</Button>
                    </TableCell>

                    <TableCell className="text-xs">{new Date(tx.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="bg-white border-neutral-200">
          <CardHeader>
            <CardTitle>Todos os Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Idioma</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.subs?.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="font-medium">{sub.profiles?.full_name || 'N/A'}</div>
                      <div className="text-xs text-neutral-400">{sub.profiles?.whatsapp}</div>
                    </TableCell>
                    <TableCell>{sub.profiles?.language === 'en' ? '🇺🇸 EN (US$)' : '🇧🇷 PT (R$)'}</TableCell>
                    <TableCell><Badge variant="outline">{sub.type.toUpperCase()}</Badge></TableCell>
                    <TableCell>
                      <Badge className={sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {sub.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(sub.expires_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = "text-[#1A1B1A]" }: any) {
  return (
    <Card className="bg-white border-neutral-200">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-neutral-100 rounded-2xl">
            <Icon className="w-6 h-6 text-[#1A1B1A]" />
          </div>
          <div>
            <p className="text-xs text-neutral-500 font-bold uppercase">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
