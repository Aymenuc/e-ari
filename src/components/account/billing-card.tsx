'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  CreditCard,
  Loader2,
  ExternalLink,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BillingCardProps {
  tier: string;
}

interface RefundRequest {
  id: string;
  amount: number;
  reason: string;
  details: string | null;
  status: string;
  chargeId: string | null;
  refundId: string | null;
  refundedAt: string | null;
  createdAt: string;
}

const REASON_LABELS: Record<string, string> = {
  service_issue: 'Service issue',
  duplicate: 'Duplicate charge',
  accidental: 'Accidental purchase',
  not_using: 'No longer using',
  billing_error: 'Billing error',
  not_as_described: 'Not as described',
  other: 'Other',
};

function refundStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px]">Pending</Badge>;
    case 'approved':
      return <Badge className="bg-eari-blue/20 text-eari-blue-light border-eari-blue/30 text-[9px]">Approved</Badge>;
    case 'rejected':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px]">Rejected</Badge>;
    case 'refunded':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]">Refunded</Badge>;
    default:
      return <Badge variant="secondary" className="text-[9px]">{status}</Badge>;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function tierLabel(tier: string): string {
  switch (tier) {
    case 'professional':
      return 'Professional';
    case 'enterprise':
      return 'Enterprise';
    default:
      return 'Free';
  }
}

function tierBadgeClasses(tier: string): string {
  switch (tier) {
    case 'professional':
      return 'bg-eari-blue/20 text-eari-blue-light border-eari-blue/30';
    case 'enterprise':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BillingCard({ tier }: BillingCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRefundHistory, setShowRefundHistory] = useState(false);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [refundLoading, setRefundLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ amount: '', reason: '', details: '' });

  const handleManageBilling = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to open billing portal');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Billing portal error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRefunds = async () => {
    try {
      setRefundLoading(true);
      const res = await fetch('/api/refunds/request');
      if (res.ok) {
        const data = await res.json();
        setRefundRequests(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently fail
    } finally {
      setRefundLoading(false);
    }
  };

  const handleToggleRefundHistory = () => {
    if (!showRefundHistory && refundRequests.length === 0 && !refundLoading) {
      fetchRefunds();
    }
    setShowRefundHistory(!showRefundHistory);
  };

  const handleSubmitRefund = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Please enter a valid amount greater than 0.');
      setSubmitting(false);
      return;
    }
    if (!formData.reason) {
      setSubmitError('Please select a reason for your refund.');
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch('/api/refunds/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: formData.reason, details: formData.details || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error || 'Failed to submit refund request');
        return;
      }
      setFormData({ amount: '', reason: '', details: '' });
      setDialogOpen(false);
      fetchRefunds();
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="bg-navy-800 border-border/60">
      <CardHeader>
        <CardTitle className="font-heading text-lg text-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          Billing & Subscription
        </CardTitle>
        <CardDescription className="font-sans">
          Manage your subscription, payment methods, and billing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-sans">Current Plan:</span>
          <Badge className={tierBadgeClasses(tier)}>
            {tierLabel(tier)} Tier
          </Badge>
        </div>

        {tier === 'free' && (
          <p className="text-sm text-muted-foreground font-sans">
            You are on the Free tier. No billing management needed — upgrade to unlock advanced features.
          </p>
        )}

        {tier !== 'free' && (
          <p className="text-sm text-muted-foreground font-sans">
            Manage your payment methods, view invoices, or update your subscription through the billing portal.
          </p>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive font-sans">{error}</p>
          </div>
        )}

        {tier !== 'free' && (
          <>
            <Separator className="bg-border/40" />

            {/* Billing Portal Button */}
            <Button
              onClick={handleManageBilling}
              disabled={loading}
              className="w-full bg-eari-blue hover:bg-eari-blue-dark text-white font-sans min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opening Billing Portal...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Billing & Payment
                </>
              )}
            </Button>

            {/* Subtle refund request link */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleToggleRefundHistory}
                className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground font-sans transition-colors flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Refund history
                {showRefundHistory ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
              </button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <button className="text-[11px] text-muted-foreground/40 hover:text-eari-blue-light font-sans transition-colors">
                    Request a refund
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-navy-800 border-border/60 text-foreground sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-lg text-foreground">
                      Submit Refund Request
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {submitError && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive font-sans">{submitError}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="refund-amount" className="text-sm text-muted-foreground font-sans">Amount (USD)</Label>
                      <Input id="refund-amount" type="number" step="0.01" min="0.01" placeholder="99.00" value={formData.amount} onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))} className="bg-navy-700 border-border/60 text-foreground font-sans" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="refund-reason" className="text-sm text-muted-foreground font-sans">Reason</Label>
                      <Select value={formData.reason} onValueChange={(value) => setFormData((prev) => ({ ...prev, reason: value }))}>
                        <SelectTrigger className="bg-navy-700 border-border/60 text-foreground font-sans">
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent className="bg-navy-800 border-border/60">
                          <SelectItem value="service_issue" className="font-sans">Service did not meet expectations</SelectItem>
                          <SelectItem value="duplicate" className="font-sans">Duplicate charge</SelectItem>
                          <SelectItem value="accidental" className="font-sans">Accidental purchase</SelectItem>
                          <SelectItem value="not_using" className="font-sans">No longer using the service</SelectItem>
                          <SelectItem value="billing_error" className="font-sans">Billing error</SelectItem>
                          <SelectItem value="other" className="font-sans">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="refund-details" className="text-sm text-muted-foreground font-sans">Details (optional)</Label>
                      <Textarea id="refund-details" placeholder="Please share any context that helps us process your request faster..." value={formData.details} onChange={(e) => setFormData((prev) => ({ ...prev, details: e.target.value }))} className="bg-navy-700 border-border/60 text-foreground font-sans min-h-[80px]" />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button variant="outline" className="font-sans" disabled={submitting}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSubmitRefund} disabled={submitting} className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans">
                      {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : 'Submit Request'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Refund History (collapsible) */}
            {showRefundHistory && (
              <div className="space-y-2">
                {refundLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : refundRequests.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 font-sans py-2">No refund requests on file.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {refundRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-2.5 rounded-lg bg-navy-700/50 border border-border/20">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground font-sans">${req.amount.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground font-sans">{REASON_LABELS[req.reason] || req.reason}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-sans">{format(new Date(req.createdAt), 'MMM d')}</span>
                          {refundStatusBadge(req.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Cancellation notice */}
        {tier !== 'free' && (
          <div className="p-3 rounded-lg bg-navy-700/30 border border-border/20">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                To cancel your subscription, use the billing portal above. Your access will continue until the end of your current billing period. Refund requests are reviewed within 2 business days.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
