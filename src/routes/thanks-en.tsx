import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommunityBanner } from '@/components/CommunityBanner';

export const Route = createFileRoute('/thanks-en')({
  component: ThanksEnPage,
  head: () => ({
    title: 'Payment Confirmed - LOVABLACK',
    meta: [
      { name: 'description', content: 'Your LOVABLACK subscription is active. Open your dashboard to download the extension and start building with unlimited credits.' },
      { property: 'og:title', content: 'Payment Confirmed - LOVABLACK' },
      { property: 'og:description', content: 'Your LOVABLACK subscription is now active. Access your dashboard and start building.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
});

function ThanksEnPage() {
  return (
    <div className="min-h-screen bg-[#F7F1EB] flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white border-neutral-200 shadow-xl text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-20 h-20 text-green-500" />
          </div>
          <CardTitle className="text-3xl font-bold text-[#1A1B1A]">Payment Received!</CardTitle>
          <CardDescription className="text-lg">
            Your LOVABLACK subscription has been activated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-neutral-600">
            You now have full access to unlimited credits and our exclusive extension.
            Your dashboard is unlocked.
          </p>
          <Link to="/dashboard">
            <Button className="w-full h-14 text-lg font-bold bg-[#1A1B1A] gap-2">
              GO TO DASHBOARD <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <CommunityBanner lang="en" />
        </CardContent>
      </Card>
    </div>
  );
}
