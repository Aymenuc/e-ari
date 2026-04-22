'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  RotateCcw,
  Loader2,
  Plus,
  AlertCircle,
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
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Reason Display Helpers ─────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  service_issue: 'Service issue',
  duplicate: 'Duplicate charge',
  accidental: 'Accidental purchase',
  not_using: 'No longer using',
  billing_error: 'Billing error',
  not_as_described: 'Not as described',
  other: 'Other',
};

function statusBadge(status: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">
          Pending
        </Badge>
      );
    case 'approved':
      return (
        <Badge className="bg-eari-blue/20 text-eari-blue-light border-eari-blue/30 hover:bg-eari-blue/30">
          Approved
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">
          Rejected
        </Badge>
      );
    case 'refunded':
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
          Refunded
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RefundCard() {
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    details: '',
  });

  // ── Fetch refund requests ──────────────────────────────────────────────
  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/refunds/request');
      if (!res.ok) throw new Error('Failed to fetch refund requests');
      const data = await res.json();
      setRefundRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Refund fetch error:', err);
      setError('Could not load refund history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  // ── Submit refund request ──────────────────────────────────────────────
  const handleSubmit = async () => {
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
        body: JSON.stringify({
          amount,
          reason: formData.reason,
          details: formData.details || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error || 'Failed to submit refund request');
        return;
      }

      // Reset form and close dialog
      setFormData({ amount: '', reason: '', details: '' });
      setDialogOpen(false);
      fetchRefunds();
    } catch (err) {
      console.error('Refund submit error:', err);
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="bg-navy-800 border-border/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading text-lg text-foreground flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-muted-foreground" />
              Request a Refund
            </CardTitle>
            <CardDescription className="font-sans mt-1">
              Submit and track your refund requests
            </CardDescription>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans min-h-[44px]"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Request
              </Button>
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
                  <Label htmlFor="refund-amount" className="text-sm text-muted-foreground font-sans">
                    Amount (USD)
                  </Label>
                  <Input
                    id="refund-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="99.00"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    className="bg-navy-700 border-border/60 text-foreground font-sans"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refund-reason" className="text-sm text-muted-foreground font-sans">
                    Reason
                  </Label>
                  <Select
                    value={formData.reason}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, reason: value }))}
                  >
                    <SelectTrigger className="bg-navy-700 border-border/60 text-foreground font-sans">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent className="bg-navy-800 border-border/60">
                      <SelectItem value="duplicate" className="font-sans">Duplicate charge</SelectItem>
                      <SelectItem value="not_as_described" className="font-sans">Not as described</SelectItem>
                      <SelectItem value="accidental" className="font-sans">Accidental purchase</SelectItem>
                      <SelectItem value="other" className="font-sans">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refund-details" className="text-sm text-muted-foreground font-sans">
                    Details (optional)
                  </Label>
                  <Textarea
                    id="refund-details"
                    placeholder="Please provide additional context about your refund request..."
                    value={formData.details}
                    onChange={(e) => setFormData((prev) => ({ ...prev, details: e.target.value }))}
                    className="bg-navy-700 border-border/60 text-foreground font-sans min-h-[80px]"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button variant="outline" className="font-sans" disabled={submitting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground font-sans">{error}</p>
        ) : refundRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground font-sans">
            No refund requests yet. Click &quot;New Request&quot; to submit one.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-3">
            {refundRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-navy-700/50 border border-border/30">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground font-sans">
                      ${req.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground font-sans">
                      {REASON_LABELS[req.reason] || req.reason}
                      {req.details && ` — ${req.details.slice(0, 40)}${req.details.length > 40 ? '...' : ''}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-sans">
                    {format(new Date(req.createdAt), 'MMM d, yyyy')}
                  </span>
                  {statusBadge(req.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
