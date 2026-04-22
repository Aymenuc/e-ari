import Link from 'next/link';
import { Home, LayoutDashboard } from 'lucide-react';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div
          className="w-full max-w-md"
          style={{ animation: 'fadeInUp 0.5s ease-out forwards' }}
        >
          <div className="rounded-xl border border-border/50 bg-navy-800 p-8 text-center shadow-lg">
            {/* 404 gradient text */}
            <h1
              className="font-heading text-8xl font-extrabold mb-4 gradient-text-blue select-none"
              style={{ animation: 'fadeInUp 0.5s ease-out 0.1s both' }}
            >
              404
            </h1>

            {/* Heading */}
            <h2
              className="font-heading text-2xl font-bold text-foreground mb-3"
              style={{ animation: 'fadeInUp 0.5s ease-out 0.2s both' }}
            >
              Page Not Found
            </h2>

            {/* Description */}
            <p
              className="text-sm text-muted-foreground font-sans mb-8 leading-relaxed"
              style={{ animation: 'fadeInUp 0.5s ease-out 0.3s both' }}
            >
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>

            {/* Actions */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
              style={{ animation: 'fadeInUp 0.5s ease-out 0.4s both' }}
            >
              <Button
                asChild
                className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans shadow-md shadow-eari-blue/20 transition-all duration-200"
              >
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Link>
              </Button>

              <Button
                variant="outline"
                asChild
                className="border-border/50 bg-navy-700/50 hover:bg-navy-700 text-foreground font-sans"
              >
                <Link href="/portal">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
