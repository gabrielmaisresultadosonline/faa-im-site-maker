import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStoredLanguage } from "@/lib/language";

export const Route = createFileRoute('/thanks')({
  component: ThanksPage,
});

function ThanksPage() {
  const isEn = getStoredLanguage() === 'en';

  return (
    <div className="min-h-screen bg-[#F7F1EB] flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white border-neutral-200 shadow-xl text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-20 h-20 text-green-500" />
          </div>
          <CardTitle className="text-3xl font-bold text-[#1A1B1A]">
            {isEn ? 'Payment Received!' : 'Pagamento Recebido!'}
          </CardTitle>
          <CardDescription className="text-lg">
            {isEn 
              ? 'Your LOVABLACK subscription has been successfully activated.' 
              : 'Sua assinatura LOVABLACK foi ativada com sucesso.'}
          </CardDescription>

        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-neutral-600">
            {isEn 
              ? 'You now have full access to infinite credits and our exclusive extension. Your dashboard is now unlocked.' 
              : 'Agora você tem acesso total aos créditos infinitos e à nossa extensão exclusiva. O seu dashboard já foi liberado.'}
          </p>
          <Link to="/dashboard">
            <Button className="w-full h-14 text-lg font-bold bg-[#1A1B1A] gap-2">
              {isEn ? 'GO TO DASHBOARD' : 'IR PARA O DASHBOARD'} <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>

        </CardContent>
      </Card>
    </div>
  );
}
