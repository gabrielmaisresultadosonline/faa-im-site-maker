import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, CreditCard, Clock, CheckCircle, XCircle, Download, Video, Settings, BookOpen, Ban, MessageSquare, RefreshCw, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { adminListUsers, adminCreateUser, adminUpdateUser, adminSetPlan } from '@/lib/admin.functions';

export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboard,
});

type PlanType = 'trial' | 'monthly' | 'semiannual' | 'annual';

const PLAN_LABELS: Record<PlanType, string> = {
  trial: 'Teste 20 min',
  monthly: 'Mensal',
  semiannual: 'Semestral',
  annual: 'Anual',
};

function AdminDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('usuarios');

  const listUsers = useServerFn(adminListUsers);
  const createUser = useServerFn(adminCreateUser);
  const updateUser = useServerFn(adminUpdateUser);
  const setPlanFn = useServerFn(adminSetPlan);

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => listUsers(),
  });

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

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const updateUserMutation = useMutation({
    mutationFn: (data: { userId: string; blocked?: boolean; customMessage?: string; resetSession?: boolean }) =>
      updateUser({ data }),
    onSuccess: () => { invalidateUsers(); toast.success('Usuário atualizado!'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setPlanMutation = useMutation({
    mutationFn: (data: { userId: string; plan: PlanType }) => setPlanFn({ data }),
    onSuccess: () => { invalidateUsers(); toast.success('Plano liberado!'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserPayload) =>
      createUser({ data }),
    onSuccess: () => { invalidateUsers(); toast.success('Usuário criado com sucesso!'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-[#F7F1EB] p-4 md:p-8 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-[#1A1B1A]">Painel Administrativo</h1>
          <p className="text-neutral-500">Gestão Total LOVABLACK</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Registros" value={stats?.total || 0} />
          <StatCard icon={CheckCircle} label="Assinaturas Ativas" value={stats?.active || 0} color="text-green-600" />
          <StatCard icon={XCircle} label="Expirados" value={stats?.expired || 0} color="text-red-600" />
          <StatCard icon={Clock} label="Testes (Trials)" value={stats?.trials || 0} color="text-blue-600" />
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 space-y-2">
            <nav className="flex flex-col space-y-1">
              {[
                { id: 'usuarios', label: 'Usuários', icon: Users },
                { id: 'vendas', label: 'Vendas', icon: CreditCard },
                { id: 'config', label: 'Configurações', icon: Settings },
                { id: 'docs', label: 'Documentação', icon: BookOpen },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    activeTab === item.id 
                      ? 'bg-[#1A1B1A] text-white shadow-lg' 
                      : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="pt-8 border-t border-neutral-200 mt-8">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 rounded-xl border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.assign('/');
                }}
              >
                <Ban className="w-5 h-5" />
                Sair do Painel
              </Button>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="hidden">
                <TabsTrigger value="usuarios">Usuários</TabsTrigger>
                <TabsTrigger value="vendas">Vendas</TabsTrigger>
                <TabsTrigger value="config">Configurações</TabsTrigger>
                <TabsTrigger value="docs">Documentação</TabsTrigger>
              </TabsList>

          {/* ============ USUÁRIOS ============ */}
          <TabsContent value="usuarios" className="space-y-6">
            <Card className="bg-white border-neutral-200">
              <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Controle de Usuários</CardTitle>
                  <CardDescription>Acessos, último login, bloqueios, avisos e liberação manual de planos</CardDescription>
                </div>
                <CreateUserDialog
                  onCreate={(payload) => createUserMutation.mutate(payload)}
                  isPending={createUserMutation.isPending}
                />
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {loadingUsers ? (
                  <p className="text-neutral-500 py-8 text-center">Carregando usuários...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Idioma</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expira</TableHead>
                        <TableHead>Último acesso</TableHead>
                        <TableHead>Bloqueio</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(users ?? []).map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="font-bold">{u.full_name || 'Sem nome'}</div>
                            <div className="text-xs text-neutral-500">{u.email}</div>
                            {u.access_password ? (
                              <div className="text-[11px] font-mono text-neutral-400">senha ext: {u.access_password}</div>
                            ) : null}
                          </TableCell>
                          <TableCell><LangTag lang={u.language} withCurrency /></TableCell>
                          <TableCell>
                            {u.plan ? <Badge variant="outline">{u.plan.toUpperCase()}</Badge> : <span className="text-xs text-neutral-400">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className={u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {u.is_active ? 'ATIVO' : 'INATIVO'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {u.expires_at ? new Date(u.expires_at).toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Nunca acessou'}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={!!u.blocked}
                              onCheckedChange={(checked) => updateUserMutation.mutate({ userId: u.id, blocked: checked })}
                            />
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <UserActions
                              user={u}
                              onMessage={(msg) => updateUserMutation.mutate({ userId: u.id, customMessage: msg })}
                              onPlan={(plan) => setPlanMutation.mutate({ userId: u.id, plan })}
                              onResetSession={() => updateUserMutation.mutate({ userId: u.id, resetSession: true })}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-neutral-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Avisos e Segurança Global</CardTitle>
                <CardDescription>Valem para toda a base de usuários da extensão</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Aviso global (global_announcement)</Label>
                  <Textarea
                    key={String(settings?.['global_announcement'] ?? 'ga')}
                    id="global-announcement-input"
                    defaultValue={(settings?.['global_announcement'] as string) ?? ''}
                    placeholder="Ex: Manutenção programada às 22h"
                  />
                  <Button onClick={() => {
                    const val = (document.getElementById('global-announcement-input') as HTMLTextAreaElement).value;
                    updateSettingMutation.mutate({ key: 'global_announcement', value: val });
                  }}>Salvar aviso</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Versão mínima da extensão (min_version)</Label>
                    <div className="flex gap-2">
                      <Input
                        key={String(settings?.['min_version'] ?? 'mv')}
                        id="min-version-input"
                        defaultValue={(settings?.['min_version'] as string) ?? '1.0.0'}
                      />
                      <Button onClick={() => {
                        const val = (document.getElementById('min-version-input') as HTMLInputElement).value;
                        updateSettingMutation.mutate({ key: 'min_version', value: val });
                      }}>Salvar</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bloqueio multi-login (multi_login_block)</Label>
                    <div className="flex items-center gap-3 h-10">
                      <Switch
                        checked={settings?.['multi_login_block'] === true}
                        onCheckedChange={(checked) => updateSettingMutation.mutate({ key: 'multi_login_block', value: checked })}
                      />
                      <span className="text-sm text-neutral-500">
                        {settings?.['multi_login_block'] === true ? 'Ativado — 1 máquina por conta' : 'Desativado'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ VENDAS ============ */}
          <TabsContent value="vendas" className="space-y-6">
            <Card className="bg-white border-neutral-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Vendas (InfinitePay R$ + Stripe US$)
                </CardTitle>
                <CardDescription>Acompanhamento de links e pagamentos em tempo real, nos dois idiomas</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
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
          </TabsContent>

          {/* ============ CONFIGURAÇÕES ============ */}
          <TabsContent value="config" className="space-y-6">
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
          </TabsContent>

          {/* ============ DOCUMENTAÇÃO ============ */}
          <TabsContent value="docs" className="space-y-6">
            <Card className="bg-white border-neutral-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> Documentação da API Lovablack</CardTitle>
                <CardDescription>Especificações técnicas para integração da extensão</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <section className="space-y-4">
                  <h3 className="text-lg font-bold text-[#1A1B1A]">Visão Geral</h3>
                  <p className="text-sm text-neutral-600">
                    API para autenticação e verificação de licenças em extensões Chrome. Toda chamada deve ser feita via POST.
                  </p>
                  <div className="bg-neutral-100 p-4 rounded-xl border border-neutral-200">
                    <p className="text-xs font-bold text-neutral-500 mb-1">ENDPOINT PROD</p>
                    <code className="text-sm text-[#DC0D0D] font-mono break-all">
                      https://lovblack.online/api/public/lovablack-api
                    </code>
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DocRule icon={Shield} title="1. Autenticação">
                    A extensão envia <code>email</code> e <code>password</code> (senha de acesso da extensão gerada no dashboard).
                  </DocRule>
                  <DocRule icon={Zap} title="2. Verificação de Plano">
                    O sistema valida se o usuário possui uma assinatura ativa (trial ou paga) e se não está expirada.
                  </DocRule>
                  <DocRule icon={RefreshCw} title="3. HWID / Multi-Login">
                    O primeiro login vincula o <code>session_id</code> (HWID da máquina) ao usuário.
                  </DocRule>
                  <DocRule icon={MessageSquare} title="4. Mensagens">
                    Retorna avisos globais e mensagens personalizadas configuradas no admin.
                  </DocRule>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-[#1A1B1A] text-neutral-100 text-xs p-4 rounded-xl overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}

function DocRule({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50">
      <h4 className="font-bold text-[#1A1B1A] flex items-center gap-2 mb-1"><Icon className="w-4 h-4" /> {title}</h4>
      <p className="text-sm text-neutral-600 leading-relaxed">{children}</p>
    </div>
  );
}

            </section>

            <Card className="bg-white border-neutral-200">
              <CardHeader>
                <CardTitle>Assinaturas registradas</CardTitle>
                <CardDescription>Histórico completo de planos e trials</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
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
                        <TableCell><LangTag lang={sub.profiles?.language} withCurrency /></TableCell>
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
          </TabsContent>

          {/* ============ DOCUMENTAÇÃO ============ */}
          <TabsContent value="docs">
            <ApiDocs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface CreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  whatsapp?: string | undefined;
  language: 'pt' | 'en';
  plan: PlanType;
}

function CreateUserDialog({ onCreate, isPending }: { onCreate: (p: CreateUserPayload) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [language, setLanguage] = useState<'pt' | 'en'>('pt');
  const [plan, setPlan] = useState<PlanType>('monthly');

  const submit = () => {
    if (!email || !password || !fullName) {
      toast.error('Preencha nome, e-mail e senha.');
      return;
    }
    onCreate({ email, password, fullName, whatsapp: whatsapp || undefined, language, plan });
    setOpen(false);
    setEmail(''); setPassword(''); setFullName(''); setWhatsapp('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#1A1B1A]"><UserPlus className="w-4 h-4" /> Criar usuário manual</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo usuário manual</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1"><Label>Senha</Label><Input value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="space-y-1"><Label>WhatsApp (opcional)</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Idioma</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as 'pt' | 'en')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">🇧🇷 Português (R$ / InfinitePay)</SelectItem>
                  <SelectItem value="en">🇺🇸 English (US$ / Stripe)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Plano</Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as PlanType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PLAN_LABELS) as PlanType[]).map((p) => (
                    <SelectItem key={p} value={p}>{PLAN_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={isPending} className="bg-[#1A1B1A]">
            {isPending ? 'Criando...' : 'Criar usuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UserActionsProps {
  user: { id: string; custom_message: string | null; full_name: string | null };
  onMessage: (msg: string) => void;
  onPlan: (plan: PlanType) => void;
  onResetSession: () => void;
}

function UserActions({ user, onMessage, onPlan, onResetSession }: UserActionsProps) {
  const [msgOpen, setMsgOpen] = useState(false);
  const [message, setMessage] = useState(user.custom_message ?? '');

  return (
    <div className="flex items-center justify-end gap-2">
      <Select onValueChange={(v) => onPlan(v as PlanType)}>
        <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Liberar plano" /></SelectTrigger>
        <SelectContent>
          {(Object.keys(PLAN_LABELS) as PlanType[]).map((p) => (
            <SelectItem key={p} value={p}>{PLAN_LABELS[p]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" title="Enviar aviso individual"><MessageSquare className="w-4 h-4" /></Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Aviso para {user.full_name || 'usuário'}</DialogTitle></DialogHeader>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensagem exibida na extensão" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setMessage(''); onMessage(''); setMsgOpen(false); }}>Limpar</Button>
            <Button className="bg-[#1A1B1A]" onClick={() => { onMessage(message); setMsgOpen(false); }}>Enviar aviso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="outline" size="icon" title="Resetar máquina (multi-login)" onClick={onResetSession}>
        <RefreshCw className="w-4 h-4" />
      </Button>
    </div>
  );
}

function ApiDocs() {
  const endpoint = typeof window !== 'undefined'
    ? `${window.location.origin}/api/public/lovablack-api`
    : 'https://lovblack.online/api/public/lovablack-api';

  return (
    <Card className="bg-white border-neutral-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> Documentação da API Lovablack</CardTitle>
        <CardDescription>
          API para autenticação da extensão Chrome e outros serviços externos, usando o e-mail e a senha cadastrados aqui.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 text-sm text-neutral-700">
        <section className="space-y-2">
          <h3 className="font-bold text-[#1A1B1A] flex items-center gap-2">
            <Badge className="bg-[#1A1B1A] text-white">POST</Badge> Login (Extensão)
          </h3>
          <p className="font-mono text-xs bg-neutral-100 p-2 rounded break-all">{endpoint}</p>
          <p className="text-xs text-neutral-500">Content-Type: application/json</p>
          <CodeBlock>{`{
  "action": "login",
  "email": "usuario@exemplo.com",
  "password": "senha_do_usuario",
  "session_id": "id_unico_da_maquina"  // OPCIONAL para bloqueio multi-login
}`}</CodeBlock>
          <p className="text-xs text-neutral-500">
            A senha aceita é a senha da conta OU a "senha ext" gerada no dashboard do cliente.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-[#1A1B1A]">Estrutura de Resposta (Sucesso)</h3>
          <CodeBlock>{`{
  "success": true,
  "user": {
    "name": "João Silva",
    "email": "usuario@exemplo.com",
    "language": "pt",
    "plan": "monthly",
    "expires_at": "2026-09-12T00:00:00.000Z",
    "is_active": true,
    "is_expired": false,
    "blocked": false,
    "custom_message": "Aviso individual aqui",
    "global_announcement": "Aviso para todos!",
    "min_version": "1.0.0"
  }
}`}</CodeBlock>
        </section>

        <section className="space-y-3">
          <h3 className="font-bold text-[#1A1B1A]">Regras de Negócio, Bloqueios e Segurança</h3>
          <DocRule icon={Ban} title="1. Bloqueio de Acesso (blocked)">
            Se <code>blocked: true</code> (HTTP 403), a extensão deve encerrar a sessão imediatamente,
            limpar dados sensíveis e exibir a tela de bloqueio administrativo.
          </DocRule>
          <DocRule icon={Clock} title="2. Expiração de Plano (is_expired)">
            Retorna <code>true</code> quando o teste de 20 minutos acabou ou a assinatura expirou.
            A extensão deve redirecionar para a página de checkout.
          </DocRule>
          <DocRule icon={Download} title="3. Controle de Versão (min_version)">
            A extensão compara a versão local do manifest com <code>min_version</code>.
            Se for inferior, o uso é bloqueado com link para baixar a nova versão.
          </DocRule>
          <DocRule icon={RefreshCw} title="4. Bloqueio Multi-Login (crítico)">
            Com o bloqueio ativo nas Configurações Globais, o primeiro login vincula o <code>session_id</code> (HWID)
            ao usuário. Um <code>session_id</code> diferente retorna HTTP 403 com <code>code: "MULTI_LOGIN"</code>.
            Armazene o <code>session_id</code> localmente e envie em todas as validações.
          </DocRule>

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-[#1A1B1A] text-neutral-100 text-xs p-4 rounded-xl overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}

function DocRule({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50">
      <h4 className="font-bold text-[#1A1B1A] flex items-center gap-2 mb-1"><Icon className="w-4 h-4" /> {title}</h4>
      <p className="text-sm text-neutral-600 leading-relaxed">{children}</p>
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

interface LangTagProps {
  lang?: string | null;
  withCurrency?: boolean;
}

function LangTag({ lang, withCurrency = false }: LangTagProps) {
  const isEn = lang === 'en';
  return (
    <Badge
      className={
        isEn
          ? 'bg-blue-100 text-blue-800 border border-blue-200 font-bold'
          : 'bg-green-100 text-green-800 border border-green-200 font-bold'
      }
    >
      {isEn ? '🇺🇸 EN' : '🇧🇷 PT'}
      {withCurrency ? (isEn ? ' · US$' : ' · R$') : ''}
    </Badge>
  );
}
