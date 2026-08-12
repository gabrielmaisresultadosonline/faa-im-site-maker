import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Shield, Zap, MessageSquare, FileText, Mic, Sparkles, PlusCircle, Eraser, Globe, Star, Clock, Heart, Users, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth/AuthModal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { LanguageSelectorModal } from "@/components/LanguageSelectorModal";
// Logos servidas como arquivos estaticos em /public para funcionar em qualquer host (Lovable e VPS).
const logoHeart = { url: "/logo-heart.png" };
const logoFull = { url: "/logo-full.png" };

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    title: "LOVABLACK - Créditos Infinitos para Lovable",
    meta: [
      { name: "description", content: "Não gaste créditos com IA lovable. Utilize Lovablack Extensao e tenha créditos infinitos. Crie sem restrições com a melhor extensão do mercado." },
      { property: "og:title", content: "LOVABLACK - Créditos Infinitos para Lovable" },
      { property: "og:description", content: "O fim dos limites de créditos no Lovable. Utilize Lovablack Extensao e tenha créditos infinitos." }
    ]
  })
});

function Index() {
  const benefits = [
    { title: "Lovable Unlimited", desc: "Use o Lovable ilimitado e de graça. Crie quantos projetos quiser, sem limite de créditos.", icon: Heart },
    { title: "Velocidade Máxima", desc: "Sem filas, sem espera. Suas requisições são processadas com prioridade total.", icon: Zap },
    { title: "Hospedagem Inclusa", desc: "Publique e hospede seus projetos gratuitamente. Lovable com hospedagem sem custo extra.", icon: Globe },
    { title: "Grátis Pra Sempre", desc: "Lovable grátis pra sempre com plano acessível. Sem surpresas, sem limites.", icon: Star },
  ];

  const features = [
    { title: "Bloqueio do Chat", desc: "Bloqueie o chat da Lovable e evite que seus créditos sejam consumidos.", icon: MessageSquare },
    { title: "Envio de Arquivos", desc: "Envie qualquer tipo de arquivo diretamente no chat para usar nos seus projetos.", icon: FileText },
    { title: "Envio de Áudio", desc: "Grave e envie áudios para descrever o que precisa — sem digitar.", icon: Mic },
    { title: "IA para Prompts", desc: "IA integrada que melhora seus prompts automaticamente.", icon: Sparkles },
    { title: "Novo Projeto Grátis", desc: "Crie novos projetos sem gastar nenhum crédito.", icon: PlusCircle },
    { title: "Tirar Marca d'Água", desc: "Remova a marca d'água da Lovable para um visual profissional.", icon: Eraser },
    { title: "Hospedagem Grátis", desc: "Publique e hospede seu projeto gratuitamente.", icon: Globe },
  ];

  const plans = [
    { 
      name: "Teste Grátis", 
      price: "R$ 0", 
      period: "20 minutos", 
      features: ["Acesso total", "Ativação instantânea", "Sem compromisso"],
      button: "COMEÇAR AGORA",
      popular: false,
      key: null,
      days: 0
    },
    { 
      name: "Mensal", 
      price: "R$ 47", 
      period: "por mês", 
      features: ["Prompts ilimitados", "Todos os navegadores", "Hospedagem inclusa", "Suporte WhatsApp"],
      button: "ASSINAR AGORA",
      popular: false,
      key: "monthly",
      days: 30
    },
    { 
      name: "Semestral", 
      price: "R$ 147", 
      period: "6 meses", 
      features: ["Melhor custo-benefício", "Prompts ilimitados", "Hospedagem inclusa", "Suporte Prioritário"],
      button: "GARANTIR AGORA",
      popular: true,
      key: "semiannual",
      days: 180
    },
    { 
      name: "Anual", 
      price: "R$ 397", 
      period: "365 dias", 
      features: ["Acesso total", "Todas atualizações", "Hospedagem inclusa", "Suporte VIP"],
      button: "ASSINAR ANUAL",
      popular: false,
      key: "annual",
      days: 365
    }
  ];


  return (
    <div className="min-h-screen font-sans selection:bg-primary/20" style={{ backgroundColor: "#F7F1EB" }}>
      <LanguageSelectorModal />
      {/* Hero Section */}
      <header className="container mx-auto px-4 pt-20 pb-16 text-center">
        <div className="flex justify-between items-center mb-8">
          <img src={logoFull.url} alt="LOVABLACK Logo" className="h-20 md:h-24 object-contain" />
          <span className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#D8D0C8] text-sm font-bold text-[#1A1B1A]">
            <Globe className="w-4 h-4" /> Português — BRL
          </span>
        </div>
        <h1 className="text-5xl md:text-8xl font-black text-[#1A1B1A] mb-6 tracking-tight leading-[1.05]">
          Não gaste créditos com IA lovable.
        </h1>
        <p className="text-xl md:text-3xl text-neutral-700 max-w-4xl mx-auto mb-10 font-medium">
          Utilize Lovablack Extensao e tenha créditos infinitos.
        </p>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-12">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" className="h-14 px-8 text-lg font-bold rounded-full bg-[#1A1B1A] text-white hover:bg-[#080808] transition-all hover:scale-105 shadow-lg shadow-[#D8D0C8]">
                🚀 TESTE GRÁTIS 20 MIN
              </Button>
            </DialogTrigger>
            <DialogContent className="p-0 border-0 bg-transparent max-w-md shadow-none">
              <AuthModal initialMode="signup" isTrial={true} />
            </DialogContent>
          </Dialog>
          
          <div className="flex items-center gap-6 text-sm text-neutral-500 font-medium">
            <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Ativação instantânea</span>
            <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Pagamento seguro</span>
          </div>
        </div>

        <div className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden border-[12px] border-white shadow-2xl bg-gradient-to-br from-[#080808] via-[#1A1B1A] to-[#DC0D0D] aspect-video flex items-center justify-center group shadow-[#D8D0C8]">
          <div className="absolute inset-0 bg-neutral-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 pointer-events-none">
             <Button variant="secondary" className="rounded-full h-20 w-20 p-0 shadow-lg border-white/20 bg-white text-neutral-900">
                <Zap className="fill-neutral-900 w-8 h-8" />
             </Button>
          </div>
          
          {/* Heart Glow Effect */}
          <div className="absolute w-64 h-64 bg-[#FF0000]/20 blur-[80px] rounded-full animate-pulse"></div>
          
          <img src={logoHeart.url} alt="LOVABLACK Icon" className="w-40 h-40 md:w-60 md:h-60 object-contain animate-pulse relative z-10 drop-shadow-[0_0_30px_rgba(220,13,13,0.5)]" />
          
          <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-5 rounded-2xl flex items-center justify-between border border-white/20 shadow-xl">
             <div className="flex items-center gap-3">
               <div className="w-3 h-3 rounded-full bg-[#DC0D0D] animate-ping"></div>
               <p className="text-sm md:text-base font-black text-[#1A1B1A] tracking-tight">🚀 ESSE SITE FOI FEITO INTEIRAMENTE POR ESSA EXTENSÃO</p>
             </div>
             <Badge className="bg-[#DC0D0D] text-white border-0 px-4 py-1 font-bold">100% GRÁTIS</Badge>
          </div>
        </div>
      </header>

      {/* Benefits */}
      <section className="py-24 bg-white/30 backdrop-blur-sm border-y border-[#D8D0C8]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#1A1B1A] mb-4">Por que escolher o LOVABLACK?</h2>
            <p className="text-[#4F4E4D]">Tudo o que você precisa para usar o Lovable de graça e ilimitado.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((b, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white border border-[#D8D0C8] hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-[#F7F1EB] flex items-center justify-center mb-6 text-[#1A1B1A] group-hover:bg-[#DC0D0D] group-hover:text-white transition-all duration-300 shadow-sm">
                  <b.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-[#1A1B1A] group-hover:text-[#DC0D0D] transition-colors">{b.title}</h3>
                <p className="text-[#4F4E4D] text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <h2 className="text-4xl font-bold mb-6">Tudo que a extensão faz por você</h2>
            <p className="text-neutral-600">Funcionalidades premium que tornam o Lovable ilimitado e profissional.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden group">
                <CardHeader className="pb-2">
                  <f.icon className="w-8 h-8 text-neutral-400 group-hover:text-neutral-900 transition-colors mb-2" />
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-neutral-500">{f.desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Important Info Section */}
      <section className="py-24 bg-[#080808] text-white rounded-[4rem] mx-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary-foreground/80 px-4 py-1">
              ✨ INFORMAÇÕES IMPORTANTES
            </Badge>
            <h2 className="text-4xl font-bold mb-4">Como Usar LOVABLACK?</h2>
            <p className="text-neutral-400">Tenha Lovable unlimited em 4 passos simples.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { s: "01", t: "Escolha seu plano", d: "Selecione o plano ideal para suas necessidades." },
              { s: "02", t: "Instale a extensão", d: "Chrome, Firefox, Edge ou Opera em segundos." },
              { s: "03", t: "Ative sua licença", d: "Ativação instantânea com sua chave de acesso." },
              { s: "04", t: "Lovable Unlimited", d: "Pronto! Crie e hospede sem limites de créditos." },
            ].map((step, i) => (
              <div key={i} className="relative p-8 border border-white/10 rounded-3xl bg-white/5 hover:bg-white/10 transition-all group">
                <span className="text-5xl font-black text-white/10 absolute -top-4 -left-2 group-hover:text-primary/20 transition-colors">{step.s}</span>
                <h3 className="text-xl font-bold mb-3 mt-4 text-white group-hover:text-primary transition-colors">{step.t}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-20 p-8 rounded-3xl bg-gradient-to-r from-[#1A1B1A] to-[#080808] border border-white/5">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Shield className="text-primary" /> Compromisso LOVABLACK
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-neutral-400 text-sm leading-relaxed">
              <p>O <b>LOVABLACK</b> foi desenvolvido com o propósito de democratizar o acesso à criação de software. Acreditamos que a criatividade não deve ser limitada por créditos ou orçamentos restritos.</p>
              <p>Nossa tecnologia de <b>Bloqueio de Chat</b> e <b>Prioridade de Requisição</b> garante que você tenha a melhor experiência possível, simulando um ambiente premium sem os custos proibitivos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-neutral-100 px-4 py-2 rounded-full mb-6">
              <Users className="w-4 h-4 text-neutral-500" />
              <span className="text-sm font-bold text-neutral-600">47 pessoas estão vendo esta página agora</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">Desbloqueie o LOVABLACK</h2>
            <p className="text-neutral-600">Escolha o plano ideal e comece a criar sem limites hoje.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <Card key={i} className={`relative flex flex-col border-neutral-200 transition-all hover:shadow-2xl ${plan.popular ? 'scale-105 border-neutral-900 shadow-xl z-10' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-4 py-1">MAIS POPULAR</Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-black text-neutral-900">{plan.price}</span>
                    <span className="text-sm text-neutral-500">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-4">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-3 text-sm text-neutral-600">
                        <Check className="w-4 h-4 text-neutral-900 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className={`w-full h-12 font-bold rounded-xl transition-all ${plan.popular ? 'bg-[#1A1B1A] hover:bg-[#080808] text-white shadow-lg shadow-[#D8D0C8]' : 'bg-[#F7F1EB] text-[#1A1B1A] hover:bg-[#D8D0C8] shadow-none border border-[#D8D0C8]'}`}>
                        {plan.button}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="p-0 border-0 bg-transparent max-w-md shadow-none">
                      <AuthModal 
                        initialMode="signup" 
                        isTrial={plan.name === "Teste Grátis"} 
                        onSuccessRedirect={plan.name === "Teste Grátis" ? undefined : {
                          key: plan.key
                        }}
                      />
                    </DialogContent>

                  </Dialog>

                </CardFooter>
              </Card>
            ))}
          </div>
          <div className="mt-12 text-center flex items-center justify-center gap-6 text-neutral-400 text-sm">
             <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Pagamento Seguro via InfinitePay</span>
             <span className="flex items-center gap-2 font-bold text-neutral-500 italic">⚡ Últimas vagas com este preço</span>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white border-y border-neutral-100">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Quem usa recomenda</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Lucas M.", role: "Dev Full-Stack", text: "Finalizei 3 projetos usando o Lovable de graça com o LOVABLACK. Antes eu ficava preso calculando créditos o tempo todo.", initials: "LM" },
              { name: "Ana Paula S.", role: "Designer UI/UX", text: "Agora tenho Lovable grátis pra sempre e posso testar todas as ideias sem me preocupar com limites. Mudou meu fluxo.", initials: "AP" },
              { name: "Rafael C.", role: "Freelancer", text: "A hospedagem grátis inclusa é um diferencial absurdo. Consigo entregar projetos maiores e mais rápido.", initials: "RC" },
            ].map((t, i) => (
              <div key={i} className="p-8 rounded-[2.5rem] bg-neutral-50 border border-neutral-100 relative">
                <Star className="w-8 h-8 text-neutral-200 absolute top-8 right-8" />
                <p className="text-lg text-neutral-700 mb-8 italic">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#1A1B1A] text-white flex items-center justify-center font-bold shadow-md">{t.initials}</div>
                  <div>
                    <h4 className="font-bold text-neutral-900">{t.name}</h4>
                    <p className="text-sm text-neutral-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="py-24 text-center container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-neutral-900 text-white p-12 md:p-20 rounded-[4rem] relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[#DC0D0D]/20 blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#DC0D0D]/10 blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
           <h2 className="text-4xl md:text-6xl font-bold mb-8 relative z-10 leading-tight">Quantos projetos você deixou de criar por falta de créditos?</h2>
           <p className="text-xl text-neutral-400 mb-12 relative z-10 max-w-2xl mx-auto">Isso acaba agora. Lovable ilimitado é realidade com <b>LOVABLACK</b>. Crie, teste e hospede sem restrições.</p>
           <Dialog>
             <DialogTrigger asChild>
               <Button size="lg" className="h-16 px-12 text-xl font-bold rounded-full bg-[#DC0D0D] text-white hover:bg-[#FF0000] transition-all hover:scale-105 relative z-10 shadow-[0_0_30px_rgba(220,13,13,0.3)] border-0">
                  🔥 QUERO MEU LOVABLACK AGORA
               </Button>
             </DialogTrigger>
             <DialogContent className="p-0 border-0 bg-transparent max-w-md shadow-none">
               <AuthModal initialMode="signup" />
             </DialogContent>
           </Dialog>
        </div>
        <div className="mt-20 pt-8 border-t border-neutral-100 flex flex-col md:flex-row justify-between items-center gap-6 text-neutral-400 text-sm">
           <p>© 2026 LOVABLACK. Todos os direitos reservados.</p>
            <div className="flex gap-8">
               <Link to="/admin" className="font-bold text-[#DC0D0D] hover:underline transition-colors">Painel Admin</Link>
               <a href="#" className="hover:text-neutral-900 transition-colors">Termos de Uso</a>
               <a href="#" className="hover:text-neutral-900 transition-colors">Privacidade</a>
            </div>
        </div>
      </footer>
    </div>
  );
}
