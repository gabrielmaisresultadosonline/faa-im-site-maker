import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from '@/integrations/supabase/client';
import { Check, Shield, Zap, MessageSquare, FileText, Mic, Sparkles, PlusCircle, Eraser, Globe, Star, Clock, Heart, Users, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth/AuthModal";
import { Dialog, DialogContent, DialogTrigger, DialogPortal } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSignedVideoUrl } from "@/lib/video.functions";
import logoHeart from "/logo-heart.png?url";
import logoFull from "/logo-full.png?url";



export const Route = createFileRoute("/ingles")({
  component: Index,
  head: () => ({
    title: "LOVABLACK - Unlimited Credits for Lovable",
    meta: [
      { name: "description", content: "Don't spend credits with Lovable AI. Use Lovablack Extension and have infinite credits. Create without restrictions with the best extension on the market." },
      { property: "og:title", content: "LOVABLACK - Unlimited Credits for Lovable" },
      { property: "og:description", content: "The end of credit limits on Lovable. Use Lovablack Extension and have infinite credits." }
    ]
  })
});

function Index() {
  const benefits = [
    { title: "Lovable Unlimited", desc: "Use Lovable unlimited and for free. Create as many projects as you want, without credit limits.", icon: Heart },
    { title: "Maximum Speed", desc: "No queues, no waiting. Your requests are processed with total priority.", icon: Zap },
    { title: "Hosting Included", desc: "Publish and host your projects for free. Lovable with hosting at no extra cost.", icon: Globe },
    { title: "Free Forever", desc: "Lovable free forever with an affordable plan. No surprises, no limits.", icon: Star },
  ];

  const features = [
    { title: "Chat Blocking", desc: "Block the Lovable chat and prevent your credits from being consumed.", icon: MessageSquare },
    { title: "File Upload", desc: "Send any type of file directly in the chat to use in your projects.", icon: FileText },
    { title: "Audio Send", desc: "Record and send audios to describe what you need — without typing.", icon: Mic },
    { title: "AI for Prompts", desc: "Integrated AI that improves your prompts automatically.", icon: Sparkles },
    { title: "New Free Project", desc: "Create new projects without spending any credits.", icon: PlusCircle },
    { title: "Remove Watermark", desc: "Remove the Lovable watermark for a professional look.", icon: Eraser },
    { title: "Free Hosting", desc: "Publish and host your project for free.", icon: Globe },
  ];

  const plans = [
    { 
      name: "Free Trial", 
      price: "$ 0", 
      period: "20 minutes", 
      features: ["Full access", "Instant activation", "No commitment"],
      button: "START NOW",
      popular: false,
      key: null,
      days: 0
    },
    { 
      name: "Monthly", 
      price: "$ 47", 
      period: "per month", 
      features: ["Unlimited prompts", "All browsers", "Hosting included", "WhatsApp support"],
      button: "SUBSCRIBE NOW",
      popular: false,
      key: "monthly",
      days: 30
    },
    { 
      name: "6 Months", 
      price: "$ 147", 
      period: "6 months", 
      features: ["Best value for money", "Unlimited prompts", "Hosting included", "Priority Support"],
      button: "SECURE NOW",
      popular: true,
      key: "semiannual",
      days: 180
    },
    { 
      name: "Annual", 
      price: "$ 397", 
      period: "365 days", 
      features: ["Full access", "All updates", "Hosting included", "VIP Support"],
      button: "SUBSCRIBE ANNUAL",
      popular: false,
      key: "annual",
      days: 365
    }
  ];

  const fetchSignedUrl = useServerFn(getSignedVideoUrl);
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const PATH = "video-0.02649446612669404.mp4";
    const PUBLIC_URL = `https://zjvmfmdyuxmyanuuralq.supabase.co/storage/v1/object/public/assets/${PATH}`;
    const loadHeroVideo = async () => {
      try {
        const { url } = await fetchSignedUrl({ data: { path: PATH } });
        setHeroVideoUrl(url || PUBLIC_URL);
      } catch (err) {
        console.warn("Signed video URL failed, using public URL:", err);
        setHeroVideoUrl(PUBLIC_URL);
      }
    };
    loadHeroVideo();
  }, [fetchSignedUrl]);


  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const isAdminEmail = session.user.email?.toLowerCase() === 'mro@gmail.com';
        window.location.replace(isAdminEmail ? '/admin/dashboard' : '/dashboard');
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen font-sans selection:bg-primary/20" style={{ backgroundColor: "#F7F1EB" }}>
      {/* Hero Section */}
      <header className="container mx-auto px-4 pt-20 pb-16 text-center relative z-20">
        <div className="flex justify-between items-center mb-8">
          <img src={logoFull} alt="LOVABLACK Logo" className="h-20 md:h-24 object-contain" />
          <span className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#D8D0C8] text-sm font-bold text-[#1A1B1A]">
            <Globe className="w-4 h-4" /> 🇺🇸 English — USD
          </span>
        </div>
        <h1 className="text-4xl md:text-7xl font-black text-[#1A1B1A] mb-6 tracking-tight leading-[1.1]">
          Don't spend credits with Lovable AI.
        </h1>
        <p className="text-xl md:text-3xl text-neutral-700 max-w-4xl mx-auto mb-10 font-medium">
          Use Lovablack Extension and get infinite credits.
        </p>
        
        <div className="flex flex-col items-center justify-center gap-6 mb-12">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="lg" className="h-14 px-8 text-lg font-bold rounded-full bg-[#1A1B1A] text-white hover:bg-[#080808] transition-all hover:scale-105 shadow-lg shadow-[#D8D0C8] cursor-pointer relative z-10">
                  🚀 20 MIN FREE TRIAL
                </Button>
              </DialogTrigger>
              <DialogPortal>
                <DialogContent className="p-0 border-0 bg-transparent max-w-md shadow-none overflow-y-auto max-h-[90vh] focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 [&>button]:hidden">
                  <AuthModal initialMode="signup" isTrial={true} lang="en" />
                </DialogContent>
              </DialogPortal>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold rounded-full border-2 border-[#1A1B1A] text-[#1A1B1A] hover:bg-[#1A1B1A] hover:text-white transition-all hover:scale-105 shadow-lg shadow-[#D8D0C8] cursor-pointer relative z-10">
                  ALREADY A MEMBER (LOGIN)
                </Button>
              </DialogTrigger>
              <DialogPortal>
                <DialogContent className="p-0 border-0 bg-transparent max-w-md shadow-none overflow-y-auto max-h-[90vh] focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 [&>button]:hidden">
                  <AuthModal initialMode="login" lang="en" />
                </DialogContent>
              </DialogPortal>
            </Dialog>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-neutral-500 font-medium">
            <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Instant activation</span>
            <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Secure payment</span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto space-y-6 text-left">
          <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between border border-[#D8D0C8] shadow-xl gap-4 md:gap-0">
             <div className="flex items-center gap-3">
               <div className="w-3 h-3 rounded-full bg-[#DC0D0D] animate-ping"></div>
               <p className="text-sm md:text-base font-black text-[#1A1B1A] tracking-tight">🚀 SEE THE TOOL IN ACTION!</p>
             </div>
             <div className="flex items-center gap-3">
               <Badge className="bg-[#DC0D0D] text-white border-0 px-4 py-1 font-bold">UPDATED AUGUST 2026</Badge>
               <Badge className="bg-[#1A1B1A] text-white border-0 px-4 py-1 font-bold hidden sm:block">100% WORKING</Badge>
             </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden border-[12px] border-white shadow-2xl bg-neutral-900 aspect-video flex items-center justify-center group shadow-[#D8D0C8]">
            {heroVideoUrl ? (
              <video
                src={heroVideoUrl}
                className="w-full h-full absolute inset-0 z-0 object-cover"
                controls
                autoPlay={false}
                playsInline
                preload="metadata"
              />
            ) : (
              <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                <Zap className="w-12 h-12 text-white/20 animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Benefits */}
      <section className="py-24 bg-white/30 backdrop-blur-sm border-y border-[#D8D0C8]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#1A1B1A] mb-4">Why choose LOVABLACK?</h2>
            <p className="text-[#4F4E4D]">Everything you need to use Lovable for free and unlimited.</p>
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
            <h2 className="text-4xl font-bold mb-6">Everything the extension does for you</h2>
            <p className="text-neutral-600">Premium features that make Lovable unlimited and professional.</p>
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
              ✨ IMPORTANT INFORMATION
            </Badge>
            <h2 className="text-4xl font-bold mb-4">How to Use LOVABLACK?</h2>
            <p className="text-neutral-400">Get Lovable unlimited in 4 simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { s: "01", t: "Choose your plan", d: "Select the ideal plan for your needs." },
              { s: "02", t: "Install the extension", d: "Chrome, Firefox, Edge or Opera in seconds." },
              { s: "03", t: "Activate your license", d: "Instant activation with your access key." },
              { s: "04", t: "Lovable Unlimited", d: "Done! Create and host without credit limits." },
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
              <Shield className="text-primary" /> LOVABLACK Commitment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-neutral-400 text-sm leading-relaxed">
              <p><b>LOVABLACK</b> was developed with the purpose of democratizing access to software creation. We believe that creativity should not be limited by credits or restricted budgets.</p>
              <p>Our <b>Chat Blocking</b> and <b>Request Priority</b> technology ensures you have the best possible experience, simulating a premium environment without the prohibitive costs.</p>
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
              <span className="text-sm font-bold text-neutral-600">47 people are viewing this page right now</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">Unlock LOVABLACK</h2>
            <p className="text-neutral-600">Choose the ideal plan and start creating without limits today.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <Card key={i} className={`relative flex flex-col border-neutral-200 transition-all hover:shadow-2xl ${plan.popular ? 'scale-105 border-neutral-900 shadow-xl z-10' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-4 py-1">MOST POPULAR</Badge>
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
                        isTrial={plan.name === "Free Trial"} 
                        lang="en"
                        onSuccessRedirect={plan.name === "Free Trial" ? undefined : {
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
             <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Secure Payment via Stripe</span>
             <span className="flex items-center gap-2 font-bold text-neutral-500 italic">⚡ Last spots at this price</span>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white border-y border-neutral-100">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Who uses it recommends it</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Lucas M.", role: "Full-Stack Dev", text: "I finished 3 projects using Lovable for free with LOVABLACK. Before, I was stuck calculating credits all the time.", initials: "LM" },
              { name: "Ana Paula S.", role: "UI/UX Designer", text: "Now I have Lovable free forever and can test all ideas without worrying about limits. It changed my workflow.", initials: "AP" },
              { name: "Rafael C.", role: "Freelancer", text: "The included free hosting is an incredible differentiator. I can deliver bigger projects faster.", initials: "RC" },
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
            <h2 className="text-4xl md:text-6xl font-bold mb-8 relative z-10 leading-tight">How many projects did you stop creating due to lack of credits?</h2>
            <p className="text-xl text-neutral-400 mb-12 relative z-10 max-w-2xl mx-auto">That ends now. Unlimited Lovable is a reality with <b>LOVABLACK</b>. Create, test and host without restrictions.</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="lg" className="h-auto py-6 px-8 md:px-12 text-lg md:text-xl font-bold rounded-full bg-[#DC0D0D] text-white hover:bg-[#FF0000] transition-all hover:scale-105 relative z-10 shadow-[0_0_30px_rgba(220,13,13,0.3)] border-0 whitespace-normal text-center leading-tight w-full md:w-auto">
                   🔥 I WANT MY LOVABLACK NOW
                </Button>
              </DialogTrigger>
             <DialogContent className="p-0 border-0 bg-transparent max-w-md shadow-none">
               <AuthModal initialMode="signup" lang="en" />
             </DialogContent>
           </Dialog>
        </div>
        <div className="mt-20 pt-8 border-t border-neutral-100 flex flex-col md:flex-row justify-between items-center gap-6 text-neutral-400 text-sm">
           <p>© 2026 LOVABLACK. All rights reserved.</p>
            <div className="flex gap-8">
               <Link to="/admin" className="font-bold text-[#DC0D0D] hover:underline transition-colors">Admin Panel</Link>
               <a href="#" className="hover:text-neutral-900 transition-colors">Terms of Use</a>
               <a href="#" className="hover:text-neutral-900 transition-colors">Privacy</a>
            </div>
        </div>
      </footer>
    </div>
  );
}
