'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Filter,
  DollarSign,
  Clock,
  RefreshCcw,
} from 'lucide-react';
import Link from 'next/link';

import { Navigation } from '@/components/shared/navigation';
import { Footer } from '@/components/shared/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RefundWithUser {
  id: string;
  amount: number;
  reason: string;
  details: string | null;
  status: string;
  chargeId: string | null;
  refundId: string | null;
  refundedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    tier: string;
  };
}

interface RefundListResponse {
  refundRequests: RefundWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Reason Display ─────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  duplicate: 'Duplicate charge',
  not_as_described: 'Not as described',
  accidental: 'Accidental purchase',
  other: 'Other',
};

// ─── Status Badges ──────────────────────────────────────────────────────────

function statusBadge(status: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">
          <Clock className="h-3 w-3 mr-1" />
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
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Refunded
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminRefundsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [refundRequests, setRefundRequests] = useState<RefundWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [totalPending, setTotalPending] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [selectedRefund, setSelectedRefund] = useState<RefundWithUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Auth gate ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (sessionStatus === 'authenticated' && (session?.user as Record<string, unknown>)?.role !== 'admin') {
      router.push('/portal');
    }
  }, [sessionStatus, session, router]);

  // ── Fetch refund requests ──────────────────────────────────────────────
  const fetchRefunds = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const res = await fetch(`/api/admin/refunds?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch refund requests');
      const data: RefundListResponse = await res.json();
      setRefundRequests(data.refundRequests);
      setTotalPending(
        data.refundRequests.filter((r) => r.status === 'pending').length,
      );
      setTotalAmount(
        data.refundRequests
          .filter((r) => r.status === 'pending')
          .reduce((sum, r) => sum + r.amount, 0),
      );
    } catch (err) {
      console.error('Refund fetch error:', err);
      setError('Could not load refund requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchRefunds();
    }
  }, [sessionStatus, fetchRefunds]);

  // ── Handle approve/reject actions ──────────────────────────────────────
  const handleAction = async () => {
    if (!selectedRefund) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const endpoint =
        actionType === 'approve'
          ? `/api/admin/refunds/${selectedRefund.id}/approve`
          : `/api/admin/refunds/${selectedRefund.id}/reject`;

      const body =
        actionType === 'reject'
          ? { rejectionReason: rejectionReason || undefined }
          : undefined;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error || `Failed to ${actionType} refund`);
        return;
      }

      // Close dialog and refresh
      setActionDialogOpen(false);
      setSelectedRefund(null);
      setRejectionReason('');
      fetchRefunds();
    } catch (err) {
      console.error(`${actionType} error:`, err);
      setActionError('An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const openActionDialog = (refund: RefundWithUser, type: 'approve' | 'reject') => {
    setSelectedRefund(refund);
    setActionType(type);
    setActionError(null);
    setRejectionReason('');
    setActionDialogOpen(true);
  };

  // ── Loading / auth states ──────────────────────────────────────────────
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-navy-900">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-eari-blue" />
        </main>
      </div>
    );
  }

  if (!session || (session?.user as Record<string, unknown>)?.role !== 'admin') {
    return null;
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      <Navigation />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="font-sans text-muted-foreground min-h-[44px]">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Admin
                </Button>
              </Link>
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
                  <RotateCcw className="h-7 w-7 text-amber-400" />
                  Refund Management
                </h1>
                <p className="text-sm text-muted-foreground font-sans mt-1">
                  Review, approve, or reject refund requests
                </p>
              </div>
            </div>
          </div>

          {/* ── Summary Cards ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="bg-navy-800 border-border/60">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                    <Clock className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-heading text-2xl font-bold text-foreground">{totalPending}</p>
                    <p className="text-xs text-muted-foreground font-sans">Pending Requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-navy-800 border-border/60">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
                    <DollarSign className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="font-heading text-2xl font-bold text-foreground">
                      ${totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground font-sans">Pending Amount</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-navy-800 border-border/60">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/20">
                    <RefreshCcw className="h-5 w-5 text-eari-blue-light" />
                  </div>
                  <div>
                    <p className="font-heading text-2xl font-bold text-foreground">
                      {refundRequests.filter((r) => r.status === 'refunded').length}
                    </p>
                    <p className="text-xs text-muted-foreground font-sans">Processed Refunds</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Filter Bar ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-sans">Filter by status:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-navy-700 border-border/60 text-foreground font-sans">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent className="bg-navy-800 border-border/60">
                <SelectItem value="all" className="font-sans">All</SelectItem>
                <SelectItem value="pending" className="font-sans">Pending</SelectItem>
                <SelectItem value="approved" className="font-sans">Approved</SelectItem>
                <SelectItem value="rejected" className="font-sans">Rejected</SelectItem>
                <SelectItem value="refunded" className="font-sans">Refunded</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="font-sans text-muted-foreground"
              onClick={fetchRefunds}
            >
              <RefreshCcw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>

          {/* ── Refund Requests Table ────────────────────────────────────── */}
          <Card className="bg-navy-800 border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-foreground">Refund Requests</CardTitle>
              <CardDescription className="font-sans">
                All refund requests from users. Approve to process via Stripe, or reject with a reason.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground font-sans">{error}</p>
                  <Button
                    variant="outline"
                    className="mt-4 font-sans"
                    onClick={fetchRefunds}
                  >
                    Retry
                  </Button>
                </div>
              ) : refundRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-700 mx-auto mb-4">
                    <RotateCcw className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-sans text-sm">
                    No refund requests found.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40 hover:bg-transparent">
                        <TableHead className="text-muted-foreground font-sans">ID</TableHead>
                        <TableHead className="text-muted-foreground font-sans">User</TableHead>
                        <TableHead className="text-muted-foreground font-sans">Amount</TableHead>
                        <TableHead className="text-muted-foreground font-sans">Reason</TableHead>
                        <TableHead className="text-muted-foreground font-sans">Status</TableHead>
                        <TableHead className="text-muted-foreground font-sans">Date</TableHead>
                        <TableHead className="text-muted-foreground font-sans text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refundRequests.map((req) => (
                        <TableRow key={req.id} className="border-border/30">
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground" title={req.id}>
                              {req.id.slice(0, 8)}...
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm text-foreground font-sans">
                                {req.user.name || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {req.user.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-sans text-sm font-medium text-foreground">
                              ${req.amount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm text-foreground font-sans">
                                {REASON_LABELS[req.reason] || req.reason}
                              </p>
                              {req.details && (
                                <p className="text-xs text-muted-foreground font-sans truncate max-w-[200px]">
                                  {req.details}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(req.status)}</TableCell>
                          <TableCell>
                            <span className="font-sans text-sm text-muted-foreground">
                              {format(new Date(req.createdAt), 'MMM d, yyyy')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {req.status === 'pending' && (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans h-8 px-3"
                                  onClick={() => openActionDialog(req, 'approve')}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500/40 text-red-400 hover:bg-red-500/10 font-sans h-8 px-3"
                                  onClick={() => openActionDialog(req, 'reject')}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                            {req.status !== 'pending' && (
                              <span className="text-xs text-muted-foreground font-sans">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Approve/Reject Dialog ────────────────────────────────────── */}
          <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
            <DialogContent className="bg-navy-800 border-border/60 text-foreground sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading text-lg text-foreground">
                  {actionType === 'approve' ? 'Approve Refund' : 'Reject Refund'}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-sans">
                  {actionType === 'approve'
                    ? 'This will process the refund through Stripe and notify the user.'
                    : 'This will reject the refund request and notify the user.'}
                </DialogDescription>
              </DialogHeader>

              {selectedRefund && (
                <div className="space-y-4 py-4">
                  {actionError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive font-sans">{actionError}</p>
                    </div>
                  )}

                  <div className="bg-navy-700/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground font-sans">Amount</span>
                      <span className="text-sm font-medium text-foreground font-sans">
                        ${selectedRefund.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground font-sans">User</span>
                      <span className="text-sm font-medium text-foreground font-sans">
                        {selectedRefund.user.name || selectedRefund.user.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground font-sans">Reason</span>
                      <span className="text-sm font-medium text-foreground font-sans">
                        {REASON_LABELS[selectedRefund.reason] || selectedRefund.reason}
                      </span>
                    </div>
                    {selectedRefund.details && (
                      <>
                        <Separator className="bg-border/40" />
                        <div>
                          <span className="text-sm text-muted-foreground font-sans">Details</span>
                          <p className="text-sm text-foreground font-sans mt-1">
                            {selectedRefund.details}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {actionType === 'reject' && (
                    <div className="space-y-2">
                      <Label htmlFor="rejection-reason" className="text-sm text-muted-foreground font-sans">
                        Rejection reason (optional)
                      </Label>
                      <Textarea
                        id="rejection-reason"
                        placeholder="Explain why this refund is being rejected..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="bg-navy-700 border-border/60 text-foreground font-sans min-h-[80px]"
                      />
                    </div>
                  )}

                  {actionType === 'approve' && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-300 font-sans">
                        This will attempt to process a Stripe refund for ${selectedRefund.amount.toFixed(2)}.
                        The user will be notified via email.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button variant="outline" className="font-sans" disabled={actionLoading}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleAction}
                  disabled={actionLoading}
                  className={
                    actionType === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-sans'
                      : 'bg-red-600 hover:bg-red-700 text-white font-sans'
                  }
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : actionType === 'approve' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve & Refund
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Refund
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>

      <Footer />
    </div>
  );
}
