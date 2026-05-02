'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Palette, CheckCircle2 } from 'lucide-react';

type BrandingSettings = {
  custom_branding_enabled: boolean;
  custom_brand_name: string;
  custom_brand_logo_url: string;
  custom_brand_accent_color: string;
};

export default function BrandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<BrandingSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.replace('/auth/login');
      return;
    }
    if (session?.user?.tier !== 'enterprise' && session?.user?.role !== 'admin') {
      router.replace('/pricing');
      return;
    }
    fetch('/api/branding-settings')
      .then((r) => r.json())
      .then((data) => setSettings(data));
  }, [status, session?.user?.tier, session?.user?.role, router]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/branding-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Card className="bg-card/80 border-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl flex items-center gap-2">
                <Palette className="h-5 w-5 text-amber-400" />
                Enterprise Custom Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!settings ? (
                <div className="py-8 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">Enable branding for report exports</p>
                      <p className="text-xs text-muted-foreground">Applies to enterprise report downloads.</p>
                    </div>
                    <Switch
                      checked={settings.custom_branding_enabled}
                      onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, custom_branding_enabled: checked } : prev)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand_name">Brand Name</Label>
                    <Input
                      id="brand_name"
                      value={settings.custom_brand_name}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, custom_brand_name: e.target.value } : prev)}
                      placeholder="Acme AI Office"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand_logo">Logo URL</Label>
                    <Input
                      id="brand_logo"
                      value={settings.custom_brand_logo_url}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, custom_brand_logo_url: e.target.value } : prev)}
                      placeholder="https://example.com/logo.svg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand_accent">Accent Color (Hex)</Label>
                    <Input
                      id="brand_accent"
                      value={settings.custom_brand_accent_color}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, custom_brand_accent_color: e.target.value } : prev)}
                      placeholder="#2563EB"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={save} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Branding
                    </Button>
                    {saved ? <span className="text-xs text-green-400 inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Saved</span> : null}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
