"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  ClipboardList,
  Crown,
  Building2,
  Shield,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileEdit,
  Archive,
  RefreshCw,
  UserCog,
  Activity,
  Brain,
  Search,
  GraduationCap,
  FileOutput,
  MessageSquare,
  BarChart3,
  Eye,
  ChevronDown,
  DollarSign,
  CreditCard,
  TrendingUp,
  PieChart as PieChartIcon,
  Settings,
  LayoutDashboard,
  Filter,
  X,
  ChevronRight,
  UserCircle,
  Receipt,
  CalendarDays,
  RotateCcw,
  Share2,
  Mail,
  Send,
  Megaphone,
  Trash2,
  ScrollText,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Navigation } from "@/components/shared/navigation";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// ─── Types ──────────────────────────────────────────────────────────────

interface Stats {
  totalUsers: number;
  totalAssessments: number;
  proUsers: number;
  enterpriseUsers: number;
  completedAssessments: number;
  draftAssessments: number;
  archivedAssessments: number;
  usersThisMonth: number;
  assessmentsThisMonth: number;
  activeUsersThisMonth: number;
  conversionFunnel: {
    signups: number;
    firstAssessment: number;
    upgradeToPro: number;
    signupToAssessment: number;
    assessmentToUpgrade: number;
  };
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  tier: string;
  role: string;
  organization: string | null;
  createdAt: string;
  assessmentCount: number;
}

interface AssessmentRow {
  id: string;
  status: string;
  sector: string;
  overallScore: number | null;
  maturityBand: string | null;
  scoringVersion: string;
  completedAt: string | null;
  createdAt: string;
  responseCount: number;
  user: {
    id: string;
    name: string | null;
    email: string;
    organization: string | null;
    tier: string;
  };
}

interface RevenueData {
  mrr: number;
  arr: number;
  totalRevenue: number;
  arpu: number;
  monthlyRevenue: { month: string; revenue: number }[];
  planDistribution: { free: number; professional: number; enterprise: number };
  recentTransactions: {
    id: string;
    email: string;
    name: string | null;
    amount: number;
    plan: string;
    date: string;
    status: "paid" | "failed" | "refunded";
  }[];
  proCount: number;
  enterpriseCount: number;
  freeCount: number;
}

interface ContactReply {
  id: string;
  subject: string;
  body: string;
  sentAt: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  company: string | null;
  subject: string;
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  replies: ContactReply[];
}

interface SubscriberRow {
  id: string;
  email: string;
  name: string | null;
  organization: string | null;
  plan: string;
  monthlyAmount: number;
  status: "active" | "cancelled";
  joinedDate: string;
  assessmentCount: number;
}

interface ComplianceLogRow {
  id: string;
  createdAt: string;
  operation: string | null;
  model: string;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  success: boolean;
  errorClass: string | null;
}

// ─── Agent Status Data ──────────────────────────────────────────────────

const AGENT_STATUS = [
  {
    id: "scoring",
    name: "Scoring Agent",
    icon: Activity,
    status: "operational",
    uptime: "99.9%",
    uptimeNum: 99.9,
    version: "4.2",
    description: "Deterministic scoring pipeline — validates, normalizes, adjusts, and classifies",
    color: "#10b981",
    avgLatency: 42,
    p99Latency: 128,
    errorRate: 0.1,
    cpu: 23,
    memory: 41,
    requests24h: 1847,
    lastIncident: null as string | null,
  },
  {
    id: "insight",
    name: "Insight Agent",
    icon: Brain,
    status: "operational",
    uptime: "99.7%",
    uptimeNum: 99.7,
    version: "4.2",
    description: "AI-powered strategic narrative generation from assessment scores",
    color: "#8b5cf6",
    avgLatency: 380,
    p99Latency: 1200,
    errorRate: 0.3,
    cpu: 45,
    memory: 62,
    requests24h: 1203,
    lastIncident: null as string | null,
  },
  {
    id: "discovery",
    name: "Discovery Agent",
    icon: Search,
    status: "operational",
    uptime: "99.5%",
    uptimeNum: 99.5,
    version: "4.2",
    description: "Conversational stakeholder interview for qualitative insights",
    color: "#3b82f6",
    avgLatency: 210,
    p99Latency: 890,
    errorRate: 0.5,
    cpu: 31,
    memory: 38,
    requests24h: 856,
    lastIncident: null as string | null,
  },
  {
    id: "report",
    name: "Report Agent",
    icon: FileOutput,
    status: "degraded",
    uptime: "98.2%",
    uptimeNum: 98.2,
    version: "4.2",
    description: "HTML report generation (PDF conversion pending server-side renderer)",
    color: "#f59e0b",
    avgLatency: 1250,
    p99Latency: 3800,
    errorRate: 1.8,
    cpu: 67,
    memory: 78,
    requests24h: 634,
    lastIncident: "2h ago",
  },
  {
    id: "assistant",
    name: "Assistant Agent",
    icon: MessageSquare,
    status: "operational",
    uptime: "99.6%",
    uptimeNum: 99.6,
    version: "4.2",
    description: "Context-aware AI companion with assessment memory",
    color: "#ec4899",
    avgLatency: 290,
    p99Latency: 980,
    errorRate: 0.4,
    cpu: 38,
    memory: 55,
    requests24h: 2104,
    lastIncident: null as string | null,
  },
  {
    id: "literacy",
    name: "Literacy Agent",
    icon: GraduationCap,
    status: "partial",
    uptime: "96.8%",
    uptimeNum: 96.8,
    version: "4.2",
    description: "AI literacy quiz + role insights (role data is currently hardcoded)",
    color: "#06b6d4",
    avgLatency: 180,
    p99Latency: 620,
    errorRate: 3.2,
    cpu: 52,
    memory: 45,
    requests24h: 423,
    lastIncident: "45m ago",
  },
];

// ─── Animation Variants ─────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

// ─── Chart Colors ───────────────────────────────────────────────────────

const PIE_COLORS = ["#64748b", "#3b82f6", "#f59e0b"];

// ─── Helper ─────────────────────────────────────────────────────────────

function tierBadge(tier: string) {
  switch (tier) {
    case "professional":
      return (
        <Badge className="bg-eari-blue/20 text-eari-blue-light border-eari-blue/30 hover:bg-eari-blue/30">
          Pro
        </Badge>
      );
    case "enterprise":
      return (
        <Badge className="bg-gold/20 text-gold border-gold/30 hover:bg-gold/30">
          Enterprise
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="bg-navy-600 text-muted-foreground border-border">
          Free
        </Badge>
      );
  }
}

function roleBadge(role: string) {
  if (role === "admin") {
    return (
      <Badge className="bg-emerald/20 text-emerald border-emerald/30 hover:bg-emerald/30">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-navy-600 text-muted-foreground border-border">
      User
    </Badge>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-emerald/15 text-emerald border-emerald/25">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    case "draft":
      return (
        <Badge className="bg-eari-blue/15 text-eari-blue-light border-eari-blue/25">
          <FileEdit className="h-3 w-3 mr-1" />
          Draft
        </Badge>
      );
    case "archived":
      return (
        <Badge className="bg-slate/15 text-slate border-slate/25">
          <Archive className="h-3 w-3 mr-1" />
          Archived
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function agentStatusBadge(status: string) {
  switch (status) {
    case "operational":
      return (
        <Badge className="bg-emerald/15 text-emerald border-emerald/25 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald mr-1 inline-block" />
          Operational
        </Badge>
      );
    case "degraded":
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1 inline-block" />
          Degraded
        </Badge>
      );
    case "partial":
      return (
        <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/25 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1 inline-block" />
          Partial
        </Badge>
      );
    case "down":
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/25 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1 inline-block" />
          Down
        </Badge>
      );
    default:
      return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
  }
}

function transactionStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-emerald/15 text-emerald border-emerald/25 text-[10px]">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/25 text-[10px]">
          <X className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    case "refunded":
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px]">
          <RefreshCw className="h-3 w-3 mr-1" />
          Refunded
        </Badge>
      );
    default:
      return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1);
  return d.toLocaleDateString("en-US", { month: "short" });
}

// ─── Tab Navigation ─────────────────────────────────────────────────────

type AdminTab =
  | "overview"
  | "revenue"
  | "users"
  | "assessments"
  | "agents"
  | "refunds"
  | "inbox"
  | "social"
  | "compliance"
  | "settings";

const NAV_ITEMS: { id: AdminTab; icon: React.ElementType; label: string }[] = [
  { id: "overview", icon: LayoutDashboard, label: "Dashboard" },
  { id: "revenue", icon: DollarSign, label: "Revenue" },
  { id: "users", icon: UserCog, label: "Users" },
  { id: "assessments", icon: ClipboardList, label: "Assessments" },
  { id: "agents", icon: Brain, label: "Agents" },
  { id: "refunds", icon: RotateCcw, label: "Refunds" },
  { id: "inbox", icon: Mail, label: "Inbox" },
  { id: "social", icon: Share2, label: "Social" },
  { id: "compliance", icon: ScrollText, label: "Compliance logs" },
  { id: "settings", icon: Settings, label: "Settings" },
];

// ─── Custom Tooltip for Charts ──────────────────────────────────────────

function RevenueChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-800 border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="font-mono text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className="font-heading text-sm font-bold text-foreground">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

function PieChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-800 border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="font-sans text-sm font-medium text-foreground capitalize">{payload[0].name}</p>
      <p className="font-heading text-sm font-bold text-eari-blue-light">{payload[0].value} users</p>
    </div>
  );
}

// ─── Settings Tab ────────────────────────────────────────────────────────

interface PlatformSettings {
  allow_registrations: boolean;
  require_email_verification: boolean;
  enable_ai_assistant: boolean;
  public_proposals_default: boolean;
  maintenance_mode: boolean;
  require_2fa: boolean;
  session_timeout: number;
  rate_limiting: boolean;
  audit_logging: boolean;
  ip_whitelisting: boolean;
  custom_branding_enabled: boolean;
  custom_brand_name: string;
  custom_brand_logo_url: string;
  custom_brand_accent_color: string;
  enterprise_price_label: string;
}

function SettingsTab() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [brandingDraft, setBrandingDraft] = useState({
    custom_brand_name: '',
    custom_brand_logo_url: '',
    custom_brand_accent_color: '#2563EB',
  });
  const [pricingDraft, setPricingDraft] = useState({
    enterprise_price_label: 'Custom',
  });
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        setSettings(data);
        setBrandingDraft({
          custom_brand_name: data.custom_brand_name || '',
          custom_brand_logo_url: data.custom_brand_logo_url || '',
          custom_brand_accent_color: data.custom_brand_accent_color || '#2563EB',
        });
        setPricingDraft({
          enterprise_price_label: data.enterprise_price_label || 'Custom',
        });
      })
      .catch(() => setLoadError(true));
  }, []);

  const toggle = async (key: keyof PlatformSettings) => {
    if (!settings) return;
    const newVal = !settings[key];
    setSettings(prev => prev ? { ...prev, [key]: newVal } : prev);
    setSaving(key);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newVal }),
      });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch {
      // Revert on error
      setSettings(prev => prev ? { ...prev, [key]: !newVal } : prev);
    } finally {
      setSaving(null);
    }
  };

  const saveBranding = async () => {
    if (!settings) return;
    setSaving('custom_branding_fields');
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandingDraft),
      });
      setSettings(prev => prev ? { ...prev, ...brandingDraft } : prev);
      setSavedKey('custom_branding_fields');
      setTimeout(() => setSavedKey(null), 2000);
    } catch {
      // Keep draft values for retry.
    } finally {
      setSaving(null);
    }
  };

  const savePricing = async () => {
    if (!settings) return;
    setSaving('pricing_fields');
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricingDraft),
      });
      setSettings(prev => prev ? { ...prev, ...pricingDraft } : prev);
      setSavedKey('pricing_fields');
      setTimeout(() => setSavedKey(null), 2000);
    } catch {
      // Keep draft value for retry.
    } finally {
      setSaving(null);
    }
  };

  if (loadError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive font-sans">Failed to load settings. Make sure the database migration has run.</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function SettingRow({ label, description, settingKey, destructive = false }: { label: string; description: string; settingKey: keyof PlatformSettings; destructive?: boolean }) {
    const isOn = !!settings?.[settingKey];
    const isSaving = saving === settingKey;
    const justSaved = savedKey === settingKey;
    return (
      <div className="flex items-center justify-between gap-4 py-4">
        <div className="flex-1 min-w-0">
          <p className={`font-sans text-sm font-medium ${destructive && isOn ? 'text-destructive' : 'text-foreground'}`}>{label}</p>
          <p className="font-sans text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {justSaved && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <Switch
            checked={isOn}
            onCheckedChange={() => toggle(settingKey)}
            disabled={isSaving}
            className="data-[state=checked]:bg-eari-blue"
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Platform Settings */}
      <Card className="bg-card/80 border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-eari-blue" />
            Platform Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/50">
          <SettingRow
            settingKey="allow_registrations"
            label="Allow New Registrations"
            description="Enable or disable user signups"
          />
          <SettingRow
            settingKey="require_email_verification"
            label="Require Email Verification"
            description="Users must verify email before accessing the dashboard"
          />
          <SettingRow
            settingKey="enable_ai_assistant"
            label="Enable AI Assistant"
            description="Allow users to access the AI governance assistant"
          />
          <SettingRow
            settingKey="public_proposals_default"
            label="Public Proposals by Default"
            description="New proposals are visible to all users"
          />
          <SettingRow
            settingKey="maintenance_mode"
            label="Maintenance Mode"
            description="Show maintenance page to non-admin users"
            destructive
          />
        </CardContent>
      </Card>

      <Card className="bg-card/80 border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            Enterprise Custom Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingRow
            settingKey="custom_branding_enabled"
            label="Enable Custom Branding in Exports"
            description="When enabled, enterprise report exports use custom brand values below."
          />
          <div className="space-y-2">
            <Label htmlFor="custom_brand_name">Brand Name</Label>
            <Input
              id="custom_brand_name"
              value={brandingDraft.custom_brand_name}
              onChange={(e) => setBrandingDraft(prev => ({ ...prev, custom_brand_name: e.target.value }))}
              placeholder="Acme AI Office"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom_brand_logo_url">Brand Logo URL (PNG/JPG/SVG)</Label>
            <Input
              id="custom_brand_logo_url"
              value={brandingDraft.custom_brand_logo_url}
              onChange={(e) => setBrandingDraft(prev => ({ ...prev, custom_brand_logo_url: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom_brand_accent_color">Accent Color (Hex)</Label>
            <Input
              id="custom_brand_accent_color"
              value={brandingDraft.custom_brand_accent_color}
              onChange={(e) => setBrandingDraft(prev => ({ ...prev, custom_brand_accent_color: e.target.value }))}
              placeholder="#2563EB"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={saveBranding}
              disabled={saving === 'custom_branding_fields'}
              className="font-heading"
            >
              {saving === 'custom_branding_fields' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Branding
            </Button>
            {savedKey === 'custom_branding_fields' ? (
              <span className="text-xs text-green-400 font-sans inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80 border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-eari-blue" />
            Pricing Labels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="enterprise_price_label">Enterprise Price Label</Label>
            <Input
              id="enterprise_price_label"
              value={pricingDraft.enterprise_price_label}
              onChange={(e) => setPricingDraft({ enterprise_price_label: e.target.value })}
              placeholder="Custom"
            />
            <p className="text-xs text-muted-foreground font-sans">
              Example values: Custom, From $499/mo, Contact Sales.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={savePricing}
              disabled={saving === 'pricing_fields'}
              className="font-heading"
            >
              {saving === 'pricing_fields' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Pricing Label
            </Button>
            {savedKey === 'pricing_fields' ? (
              <span className="text-xs text-green-400 font-sans inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Security & Access */}
      <Card className="bg-card/80 border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-eari-blue" />
            Security &amp; Access
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/50">
          <SettingRow
            settingKey="require_2fa"
            label="Two-Factor Authentication"
            description="Require 2FA for admin accounts"
          />
          <SettingRow
            settingKey="rate_limiting"
            label="Rate Limiting"
            description="Limit API requests per user to 100/min"
          />
          <SettingRow
            settingKey="audit_logging"
            label="Audit Logging"
            description="Log all admin actions for compliance"
          />
          <SettingRow
            settingKey="ip_whitelisting"
            label="IP Whitelisting"
            description="Restrict admin access to known IPs"
          />
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card className="bg-card/80 border-border">
        <CardHeader>
          <CardTitle className="font-heading text-base">Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { name: 'Stripe', status: 'Connected', color: 'emerald' },
              { name: 'PostgreSQL', status: 'Connected', color: 'emerald' },
              { name: 'Resend Email', status: 'Connected', color: 'emerald' },
              { name: 'Gemini AI', status: 'Active', color: 'amber' },
            ].map(({ name, status: s, color }) => (
              <div key={name} className="flex items-center justify-between rounded-lg border border-border/50 bg-navy-700/30 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${color === 'emerald' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="font-sans text-sm text-foreground">{name}</span>
                </div>
                <Badge className={`text-[10px] ${color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/15 text-amber-400 border-amber-500/25'}`}>{s}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assessmentFilter, setAssessmentFilter] = useState<string>("all");
  const [userTierFilter, setUserTierFilter] = useState<string>("all");
  const [subscriberPlanFilter, setSubscriberPlanFilter] = useState<string>("all");
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [posts, setPosts] = useState<{ id: string; content: string; platform: string; status: string; autoGenerated: boolean; scheduledAt: string | null; publishedAt: string | null }[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<{ id: string; provider: string; isActive: boolean }[]>([]);

  // Inbox state
  const [inboxMessages, setInboxMessages] = useState<ContactMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [inboxStatusFilter, setInboxStatusFilter] = useState("all");
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyResult, setReplyResult] = useState<{ success: boolean; message: string } | null>(null);

  const [complianceLogs, setComplianceLogs] = useState<ComplianceLogRow[]>([]);
  const [complianceLogsTotal, setComplianceLogsTotal] = useState(0);
  const [complianceLogsPage, setComplianceLogsPage] = useState(0);
  const [complianceLogsLoading, setComplianceLogsLoading] = useState(false);
  const [complianceLogsOpDraft, setComplianceLogsOpDraft] = useState("");
  const [complianceLogsOpApplied, setComplianceLogsOpApplied] = useState("");
  const [complianceLogsSuccessFilter, setComplianceLogsSuccessFilter] = useState<"all" | "true" | "false">("all");

  // Email dialog state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTarget, setEmailTarget] = useState<UserRow | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailBroadcastTier, setEmailBroadcastTier] = useState("all");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError("Failed to load users");
      }
    } catch {
      setError("Failed to load users");
    }
  }, []);

  // Fetch assessments
  const fetchAssessments = useCallback(async () => {
    try {
      const statusParam = assessmentFilter !== "all" ? `?status=${assessmentFilter}` : "";
      const res = await fetch(`/api/admin/assessments${statusParam}`);
      if (res.ok) {
        const data = await res.json();
        setAssessments(data.assessments || []);
      }
    } catch {
      // silently fail
    }
  }, [assessmentFilter]);

  // Fetch revenue data
  const fetchRevenue = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/revenue");
      if (res.ok) {
        const data = await res.json();
        setRevenueData(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  // Fetch subscribers
  const fetchSubscribers = useCallback(async () => {
    try {
      const planParam = subscriberPlanFilter !== "all" ? `?plan=${subscriberPlanFilter}` : "";
      const res = await fetch(`/api/admin/subscribers${planParam}`);
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data.subscribers || []);
      }
    } catch {
      // silently fail
    }
  }, [subscriberPlanFilter]);

  // Fetch social posts
  const fetchSocialPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/social/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  // Fetch social accounts
  const fetchSocialAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/social/accounts");
      if (res.ok) {
        const data = await res.json();
        setSocialAccounts(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchInbox = useCallback(async (s?: string) => {
    try {
      const q = s && s !== "all" ? `?status=${s}` : "";
      const res = await fetch(`/api/admin/inbox${q}`);
      if (res.ok) setInboxMessages(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchComplianceLogs = useCallback(async () => {
    setComplianceLogsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(complianceLogsPage));
      params.set("pageSize", "50");
      if (complianceLogsOpApplied.trim()) params.set("operation", complianceLogsOpApplied.trim());
      if (complianceLogsSuccessFilter === "true") params.set("success", "true");
      if (complianceLogsSuccessFilter === "false") params.set("success", "false");
      const res = await fetch(`/api/admin/compliance-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setComplianceLogs(data.logs ?? []);
        setComplianceLogsTotal(typeof data.total === "number" ? data.total : 0);
      }
    } catch {
      /* silent */
    } finally {
      setComplianceLogsLoading(false);
    }
  }, [
    complianceLogsPage,
    complianceLogsOpApplied,
    complianceLogsSuccessFilter,
  ]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user?.role !== "admin") {
      return;
    }

    setLoading(true);
    Promise.all([fetchStats(), fetchUsers(), fetchAssessments(), fetchRevenue(), fetchSubscribers(), fetchSocialPosts(), fetchSocialAccounts(), fetchInbox()]).finally(() => setLoading(false));
  }, [session, status, fetchStats, fetchUsers, fetchAssessments, fetchRevenue, fetchSubscribers, fetchSocialPosts, fetchSocialAccounts, fetchInbox]);

  // Refetch subscribers when plan filter changes
  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchSubscribers();
    }
  }, [subscriberPlanFilter, fetchSubscribers, session]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "admin") return;
    if (activeTab !== "compliance") return;
    void fetchComplianceLogs();
  }, [activeTab, fetchComplianceLogs, session, status]);

  // ─── Access Control ───────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-eari-blue" />
            <p className="text-muted-foreground font-sans text-sm">Verifying access...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!session || session.user?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-8 max-w-md w-full text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Access Denied
            </h2>
            <p className="text-muted-foreground font-sans text-sm mb-6">
              You do not have admin privileges to view this page. Contact your
              organization administrator if you believe this is an error.
            </p>
            <Button
              onClick={() => router.push("/portal")}
              className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Button>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleTierChange = async (userId: string, newTier: string) => {
    setUpdatingUserId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: newTier }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, tier: newTier } : u))
        );
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update tier");
      }
    } catch {
      setError("Failed to update tier");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    setUpdatingUserId(userId);
    setError(null);
    const newRole = currentRole === "admin" ? "user" : "admin";

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update role");
      }
    } catch {
      setError("Failed to update role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, displayName?: string | null) => {
    const confirmed = window.confirm(
      `Delete user ${displayName || "this account"}? This permanently removes the account and related data.`
    );
    if (!confirmed) return;

    setUpdatingUserId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        if (selectedUser?.id === userId) {
          setSelectedUser(null);
          setShowUserDetails(false);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete user");
      }
    } catch {
      setError("Failed to delete user");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleAssessmentStatus = async (assessmentId: string, newStatus: string) => {
    setError(null);
    try {
      const res = await fetch("/api/admin/assessments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, status: newStatus }),
      });

      if (res.ok) {
        setAssessments((prev) =>
          prev.map((a) => (a.id === assessmentId ? { ...a, status: newStatus } : a))
        );
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update assessment");
      }
    } catch {
      setError("Failed to update assessment");
    }
  };

  const handleSendEmail = async () => {
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: emailTarget?.id,
          tier: emailTarget ? undefined : emailBroadcastTier,
          subject: emailSubject,
          body: emailBody,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailResult({ success: true, message: data.message });
        setTimeout(() => {
          setShowEmailDialog(false);
          setEmailSubject("");
          setEmailBody("");
          setEmailTarget(null);
          setEmailResult(null);
        }, 2500);
      } else {
        setEmailResult({ success: false, message: data.error || "Failed to send email" });
      }
    } catch {
      setEmailResult({ success: false, message: "Network error" });
    } finally {
      setEmailSending(false);
    }
  };

  const handleSelectMessage = async (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setReplySubject(`Re: ${msg.subject}`);
    setReplyBody("");
    setReplyResult(null);
    if (msg.status === "new") {
      await fetch(`/api/admin/inbox/${msg.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "read" }) });
      setInboxMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, status: "read" } : m));
    }
  };

  const handleArchiveMessage = async (id: string) => {
    await fetch(`/api/admin/inbox/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "archived" }) });
    setInboxMessages((prev) => prev.map((m) => m.id === id ? { ...m, status: "archived" } : m));
    if (selectedMessage?.id === id) setSelectedMessage((prev) => prev ? { ...prev, status: "archived" } : null);
  };

  const handleSendReply = async () => {
    if (!selectedMessage) return;
    setReplySending(true);
    setReplyResult(null);
    try {
      const res = await fetch(`/api/admin/inbox/${selectedMessage.id}/reply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: replySubject, replyBody }),
      });
      const data = await res.json();
      if (res.ok) {
        setReplyResult({ success: true, message: "Reply sent successfully" });
        const updatedMsg = { ...selectedMessage, status: "replied", replies: [...selectedMessage.replies, { id: data.id, subject: replySubject, body: replyBody, sentAt: new Date().toISOString() }] };
        setSelectedMessage(updatedMsg);
        setInboxMessages((prev) => prev.map((m) => m.id === selectedMessage.id ? updatedMsg : m));
        setReplyBody("");
      } else {
        setReplyResult({ success: false, message: data.error || "Failed to send reply" });
      }
    } catch {
      setReplyResult({ success: false, message: "Network error" });
    } finally {
      setReplySending(false);
    }
  };

  const openEmailDialog = (user: UserRow | null) => {
    setEmailTarget(user);
    setEmailSubject("");
    setEmailBody("");
    setEmailResult(null);
    setEmailBroadcastTier("all");
    setShowEmailDialog(true);
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchStats(), fetchUsers(), fetchAssessments(), fetchRevenue(), fetchSubscribers(), fetchSocialPosts(), fetchSocialAccounts(), fetchInbox()]);
    setLoading(false);
  };

  // ─── Filtered Users ───────────────────────────────────────────────────

  const filteredUsers = userTierFilter === "all"
    ? users
    : users.filter((u) => u.tier === userTierFilter);

  // ─── Filtered Subscribers ─────────────────────────────────────────────

  const filteredSubscribers = subscribers.filter((s) => {
    if (subscriberSearch) {
      const q = subscriberSearch.toLowerCase();
      return (
        s.email.toLowerCase().includes(q) ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.organization && s.organization.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // ─── Pie chart data ───────────────────────────────────────────────────

  const pieData = revenueData
    ? [
        { name: "Free", value: revenueData.planDistribution.free },
        { name: "Professional", value: revenueData.planDistribution.professional },
        { name: "Enterprise", value: revenueData.planDistribution.enterprise },
      ]
    : [];

  const totalPieUsers = pieData.reduce((sum, d) => sum + d.value, 0);

  // ─── Stat Card Data ───────────────────────────────────────────────────

  const overviewStatCards = [
    {
      label: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-eari-blue",
      bgColor: "bg-eari-blue/10",
      borderColor: "border-eari-blue/20",
    },
    {
      label: "Assessments This Month",
      value: stats?.assessmentsThisMonth ?? 0,
      icon: ClipboardList,
      color: "text-emerald",
      bgColor: "bg-emerald/10",
      borderColor: "border-emerald/20",
    },
    {
      label: "Active Users (30d)",
      value: stats?.activeUsersThisMonth ?? 0,
      icon: Activity,
      color: "text-eari-blue-light",
      bgColor: "bg-eari-blue-light/10",
      borderColor: "border-eari-blue-light/20",
    },
    {
      label: "Enterprise Tier",
      value: stats?.enterpriseUsers ?? 0,
      icon: Building2,
      color: "text-gold",
      bgColor: "bg-gold/10",
      borderColor: "border-gold/20",
    },
  ];

  const revenueKpiCards = [
    {
      label: "MRR",
      value: formatCurrency(revenueData?.mrr ?? 0),
      icon: DollarSign,
      color: "text-emerald",
      bgColor: "bg-emerald/10",
      borderColor: "border-emerald/20",
      sub: "Monthly Recurring Revenue",
    },
    {
      label: "ARR",
      value: formatCurrency(revenueData?.arr ?? 0),
      icon: TrendingUp,
      color: "text-eari-blue-light",
      bgColor: "bg-eari-blue-light/10",
      borderColor: "border-eari-blue-light/20",
      sub: "Annual Recurring Revenue",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(revenueData?.totalRevenue ?? 0),
      icon: CreditCard,
      color: "text-gold",
      bgColor: "bg-gold/10",
      borderColor: "border-gold/20",
      sub: "All-time estimated",
    },
    {
      label: "ARPU",
      value: formatCurrency(revenueData?.arpu ?? 0),
      icon: PieChartIcon,
      color: "text-eari-blue",
      bgColor: "bg-eari-blue/10",
      borderColor: "border-eari-blue/20",
      sub: "Avg Revenue Per User/mo",
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Header */}
        <section className="border-b border-border/50 bg-navy-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/10 border border-eari-blue/20">
                    <Shield className="h-5 w-5 text-eari-blue" />
                  </div>
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                    Admin Control Centre
                  </h1>
                </div>
                <p className="text-muted-foreground font-sans text-sm ml-[52px]">
                  Revenue, users, assessments, and platform oversight.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="border-border text-muted-foreground hover:text-foreground font-sans"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Link href="/portal">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground font-sans"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Portal
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 flex items-center gap-3 mb-6"
            >
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive font-sans">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-destructive/70 hover:text-destructive text-sm"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {/* ── Sidebar Navigation ─────────────────────────────────────── */}
          <nav aria-label="Admin sections" className="mb-8">
            {/* Mobile menu button */}
            <div className="lg:hidden mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-full justify-between border-border font-sans"
              >
                <span className="flex items-center gap-2">
                  {(() => { const item = NAV_ITEMS.find((n) => n.id === activeTab); const Icon = item?.icon ?? LayoutDashboard; return <><Icon className="h-4 w-4" />{item?.label ?? "Dashboard"}</>; })()}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
              </Button>
            </div>

            {/* Mobile dropdown */}
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="lg:hidden overflow-hidden mb-4"
                >
                  <div className="flex flex-col gap-1 p-2 rounded-lg border border-border/50 bg-card/50">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const unread = item.id === "inbox" ? inboxMessages.filter((m) => m.status === "new").length : 0;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm font-heading font-medium rounded-lg transition-all duration-200 ${
                            activeTab === item.id
                              ? "bg-eari-blue/15 text-eari-blue-light border border-eari-blue/30"
                              : "text-muted-foreground hover:text-foreground hover:bg-navy-700/50 border border-transparent"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                          {unread > 0 && <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-eari-blue text-[9px] font-bold text-white">{unread}</span>}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Desktop sidebar tabs */}
            <div className="hidden lg:flex items-center gap-1 p-1.5 rounded-xl border border-border/40 bg-card/30">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const unread = item.id === "inbox" ? inboxMessages.filter((m) => m.status === "new").length : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex items-center gap-2 px-4 py-2 text-sm font-heading font-medium rounded-lg transition-all duration-200 ${
                      activeTab === item.id
                        ? "bg-eari-blue/15 text-eari-blue-light border border-eari-blue/30 shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-navy-700/50 border border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {unread > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-eari-blue text-[9px] font-bold text-white">{unread}</span>}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ═══════════════════════════════════════════════════════════════
             OVERVIEW TAB
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Cards Row */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
              >
                {overviewStatCards.map((card) => (
                  <motion.div key={card.label} variants={fadeInUp}>
                    <Card
                      className={`bg-card/80 border ${card.borderColor} hover:border-opacity-60 transition-all duration-300 hover:shadow-lg hover:shadow-black/10`}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-sans font-medium text-muted-foreground flex items-center gap-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-md ${card.bgColor}`}
                          >
                            <card.icon className={`h-4 w-4 ${card.color}`} />
                          </div>
                          {card.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-baseline gap-2">
                          <span className="font-heading text-3xl font-bold text-foreground">
                            {loading && !stats ? (
                              <span className="inline-block h-8 w-16 animate-pulse rounded bg-navy-700" />
                            ) : (
                              card.value.toLocaleString()
                            )}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Conversion Funnel + Assessments Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversion Funnel */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="bg-card/80 border-border h-full">
                    <CardHeader>
                      <CardTitle className="font-heading text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-eari-blue" />
                        Conversion Funnel
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading && !stats ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 animate-pulse rounded-lg bg-navy-700" />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Sign-ups */}
                          <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-eari-blue/10">
                                  <Users className="h-4 w-4 text-eari-blue" />
                                </div>
                                <div>
                                  <p className="text-sm font-sans font-medium text-foreground">Sign-ups</p>
                                  <p className="text-[10px] font-mono text-muted-foreground">Total registered users</p>
                                </div>
                              </div>
                              <span className="font-heading text-2xl font-bold text-foreground">{stats?.conversionFunnel.signups ?? 0}</span>
                            </div>
                            <div className="w-full bg-navy-700 rounded-full h-2">
                              <div className="bg-eari-blue h-2 rounded-full" style={{ width: "100%" }} />
                            </div>
                          </div>

                          {/* First Assessment */}
                          <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald/10">
                                  <ClipboardList className="h-4 w-4 text-emerald" />
                                </div>
                                <div>
                                  <p className="text-sm font-sans font-medium text-foreground">First Assessment</p>
                                  <p className="text-[10px] font-mono text-muted-foreground">{stats?.conversionFunnel.signupToAssessment ?? 0}% conversion</p>
                                </div>
                              </div>
                              <span className="font-heading text-2xl font-bold text-foreground">{stats?.conversionFunnel.firstAssessment ?? 0}</span>
                            </div>
                            <div className="w-full bg-navy-700 rounded-full h-2">
                              <div className="bg-emerald h-2 rounded-full transition-all duration-700" style={{ width: `${stats?.conversionFunnel.signupToAssessment ?? 0}%` }} />
                            </div>
                          </div>

                          {/* Upgrade to Pro */}
                          <div className="relative">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gold/10">
                                  <Crown className="h-4 w-4 text-gold" />
                                </div>
                                <div>
                                  <p className="text-sm font-sans font-medium text-foreground">Upgrade to Pro+</p>
                                  <p className="text-[10px] font-mono text-muted-foreground">{stats?.conversionFunnel.assessmentToUpgrade ?? 0}% conversion</p>
                                </div>
                              </div>
                              <span className="font-heading text-2xl font-bold text-foreground">{stats?.conversionFunnel.upgradeToPro ?? 0}</span>
                            </div>
                            <div className="w-full bg-navy-700 rounded-full h-2">
                              <div className="bg-gold h-2 rounded-full transition-all duration-700" style={{ width: `${stats?.conversionFunnel.assessmentToUpgrade ?? 0}%` }} />
                            </div>
                          </div>

                          {/* Funnel visual connector */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/40">
                            <div className="text-center flex-1">
                              <p className="font-mono text-[10px] text-muted-foreground">Sign-up to Assessment</p>
                              <p className="font-heading text-lg font-bold text-emerald">{stats?.conversionFunnel.signupToAssessment ?? 0}%</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <div className="text-center flex-1">
                              <p className="font-mono text-[10px] text-muted-foreground">Assessment to Upgrade</p>
                              <p className="font-heading text-lg font-bold text-gold">{stats?.conversionFunnel.assessmentToUpgrade ?? 0}%</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Assessments Overview */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card className="bg-card/80 border-border h-full">
                    <CardHeader>
                      <CardTitle className="font-heading text-lg flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-emerald" />
                        Assessments Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading && !stats ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-28 animate-pulse rounded-xl bg-navy-700" />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                          {/* Completed */}
                          <div className="relative rounded-xl border border-emerald/20 bg-emerald/5 p-5 overflow-hidden group hover:border-emerald/40 transition-all duration-300">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-300" />
                            <div className="relative flex items-start justify-between">
                              <div>
                                <p className="text-xs font-sans font-medium text-emerald/70 mb-1">Completed</p>
                                <p className="font-heading text-3xl font-bold text-emerald">{stats?.completedAssessments ?? 0}</p>
                              </div>
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10">
                                <CheckCircle2 className="h-5 w-5 text-emerald" />
                              </div>
                            </div>
                            <div className="mt-3 w-full bg-navy-700 rounded-full h-1.5">
                              <div
                                className="bg-emerald h-1.5 rounded-full transition-all duration-700"
                                style={{ width: `${stats?.totalAssessments ? Math.round((stats.completedAssessments / stats.totalAssessments) * 100) : 0}%` }}
                              />
                            </div>
                            <p className="mt-1.5 text-xs font-mono text-muted-foreground">
                              {stats?.totalAssessments ? Math.round((stats.completedAssessments / stats.totalAssessments) * 100) : 0}% of total
                            </p>
                          </div>
                          {/* Draft */}
                          <div className="relative rounded-xl border border-eari-blue/20 bg-eari-blue/5 p-5 overflow-hidden group hover:border-eari-blue/40 transition-all duration-300">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-eari-blue/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-300" />
                            <div className="relative flex items-start justify-between">
                              <div>
                                <p className="text-xs font-sans font-medium text-eari-blue-light/70 mb-1">Draft</p>
                                <p className="font-heading text-3xl font-bold text-eari-blue-light">{stats?.draftAssessments ?? 0}</p>
                              </div>
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eari-blue/10">
                                <FileEdit className="h-5 w-5 text-eari-blue-light" />
                              </div>
                            </div>
                            <div className="mt-3 w-full bg-navy-700 rounded-full h-1.5">
                              <div
                                className="bg-eari-blue h-1.5 rounded-full transition-all duration-700"
                                style={{ width: `${stats?.totalAssessments ? Math.round((stats.draftAssessments / stats.totalAssessments) * 100) : 0}%` }}
                              />
                            </div>
                            <p className="mt-1.5 text-xs font-mono text-muted-foreground">
                              {stats?.totalAssessments ? Math.round((stats.draftAssessments / stats.totalAssessments) * 100) : 0}% of total
                            </p>
                          </div>
                          {/* Archived */}
                          <div className="relative rounded-xl border border-slate/20 bg-slate/5 p-5 overflow-hidden group hover:border-slate/40 transition-all duration-300">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-slate/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-300" />
                            <div className="relative flex items-start justify-between">
                              <div>
                                <p className="text-xs font-sans font-medium text-slate/70 mb-1">Archived</p>
                                <p className="font-heading text-3xl font-bold text-slate">{stats?.archivedAssessments ?? 0}</p>
                              </div>
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate/10">
                                <Archive className="h-5 w-5 text-slate" />
                              </div>
                            </div>
                            <div className="mt-3 w-full bg-navy-700 rounded-full h-1.5">
                              <div
                                className="bg-slate h-1.5 rounded-full transition-all duration-700"
                                style={{ width: `${stats?.totalAssessments ? Math.round((stats.archivedAssessments / stats.totalAssessments) * 100) : 0}%` }}
                              />
                            </div>
                            <p className="mt-1.5 text-xs font-mono text-muted-foreground">
                              {stats?.totalAssessments ? Math.round((stats.archivedAssessments / stats.totalAssessments) * 100) : 0}% of total
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* ─── Agent Fleet Health ──────────────────────────────────────── */}
              <Card className="bg-card/80 border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading text-sm text-foreground flex items-center gap-2">
                      <Brain className="h-4 w-4 text-eari-blue" />
                      Agent Fleet Health
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px] border-border text-muted-foreground">
                      {AGENT_STATUS.filter(a => a.status === "operational").length}/{AGENT_STATUS.length} Healthy
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {AGENT_STATUS.map((agent) => {
                      const AgentIcon = agent.icon;
                      return (
                        <div key={agent.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-navy-800/40 border border-border/20">
                          <div className="relative">
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: agent.status === "operational" ? "#10b981" : agent.status === "degraded" ? "#f59e0b" : "#06b6d4" }} />
                            <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: `${agent.color}15` }}>
                              <AgentIcon className="h-3.5 w-3.5" style={{ color: agent.color }} />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading text-[11px] font-medium text-foreground truncate">{agent.name.replace(' Agent', '')}</p>
                            <p className="font-mono text-[9px] text-muted-foreground">{agent.uptime}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* ─── Pending Refunds Widget ──────────────────────────────────── */}
              <Card className="bg-card/80 border-amber-500/20 hover:border-amber-500/40 transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading text-sm text-foreground flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-amber-400" />
                      Pending Refunds
                    </CardTitle>
                    <Link href="/admin/refunds">
                      <Button variant="ghost" size="sm" className="font-sans text-amber-400 hover:text-amber-300 h-7 px-2 text-xs">
                        View All
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-heading text-2xl font-bold text-foreground">—</p>
                        <p className="text-xs text-muted-foreground font-sans">Pending requests</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
                        <DollarSign className="h-5 w-5 text-red-400" />
                      </div>
                      <div>
                        <p className="font-heading text-2xl font-bold text-foreground">—</p>
                        <p className="text-xs text-muted-foreground font-sans">Pending amount</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-sans mt-3">
                    Refund data loads when admin refunds page is visited.{' '}
                    <Link href="/admin/refunds" className="text-amber-400 hover:underline">
                      Manage refunds →
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
             REVENUE & BILLING TAB
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "revenue" && (
            <div className="space-y-6">
              {/* Revenue KPI Cards */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
              >
                {revenueKpiCards.map((card) => (
                  <motion.div key={card.label} variants={fadeInUp}>
                    <Card
                      className={`bg-card/80 border ${card.borderColor} hover:border-opacity-60 transition-all duration-300 hover:shadow-lg hover:shadow-black/10`}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-sans font-medium text-muted-foreground flex items-center gap-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-md ${card.bgColor}`}
                          >
                            <card.icon className={`h-4 w-4 ${card.color}`} />
                          </div>
                          {card.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-baseline gap-2">
                          <span className="font-heading text-3xl font-bold text-foreground">
                            {loading && !revenueData ? (
                              <span className="inline-block h-8 w-24 animate-pulse rounded bg-navy-700" />
                            ) : (
                              card.value
                            )}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground mt-1">{card.sub}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Revenue Chart + Plan Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Bar Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="lg:col-span-2"
                >
                  <Card className="bg-card/80 border-border">
                    <CardHeader>
                      <CardTitle className="font-heading text-lg flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-eari-blue" />
                        Monthly Revenue (12 Months)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading && !revenueData ? (
                        <div className="h-[300px] flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-eari-blue" />
                        </div>
                      ) : (
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData?.monthlyRevenue ?? []} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(48, 57, 74, 0.4)" />
                              <XAxis
                                dataKey="month"
                                tickFormatter={formatMonthLabel}
                                tick={{ fill: "#8b949e", fontSize: 11, fontFamily: "JetBrains Mono" }}
                                axisLine={{ stroke: "rgba(48, 57, 74, 0.6)" }}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fill: "#8b949e", fontSize: 11, fontFamily: "JetBrains Mono" }}
                                axisLine={{ stroke: "rgba(48, 57, 74, 0.6)" }}
                                tickLine={false}
                                tickFormatter={(v: number) => `$${v}`}
                              />
                              <Tooltip content={<RevenueChartTooltip />} />
                              <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                {(revenueData?.monthlyRevenue ?? []).map((_, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill="url(#revenueGradient)"
                                  />
                                ))}
                              </Bar>
                              <defs>
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.5} />
                                </linearGradient>
                              </defs>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Plan Distribution Pie Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card className="bg-card/80 border-border h-full">
                    <CardHeader>
                      <CardTitle className="font-heading text-lg flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5 text-gold" />
                        Plan Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading && !revenueData ? (
                        <div className="h-[200px] flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-eari-blue" />
                        </div>
                      ) : (
                        <div>
                          <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={80}
                                  paddingAngle={4}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {pieData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                                  ))}
                                </Pie>
                                <Tooltip content={<PieChartTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          {/* Legend */}
                          <div className="space-y-2 mt-2">
                            {pieData.map((entry, index) => (
                              <div key={entry.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: PIE_COLORS[index] }}
                                  />
                                  <span className="font-sans text-xs text-muted-foreground capitalize">{entry.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-heading text-sm font-semibold text-foreground">{entry.value}</span>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {totalPieUsers > 0 ? Math.round((entry.value / totalPieUsers) * 100) : 0}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Subscriber Table */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="bg-card/80 border-border">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <CardTitle className="font-heading text-lg flex items-center gap-2">
                        <Crown className="h-5 w-5 text-gold" />
                        Subscribers
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Search..."
                            value={subscriberSearch}
                            onChange={(e) => setSubscriberSearch(e.target.value)}
                            className="h-8 w-[160px] pl-8 text-xs font-sans border-border bg-navy-700/50"
                          />
                        </div>
                        <Select value={subscriberPlanFilter} onValueChange={setSubscriberPlanFilter}>
                          <SelectTrigger className="w-[130px] h-8 text-xs font-sans border-border bg-navy-700/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-navy-800 border-border">
                            <SelectItem value="all" className="font-sans text-sm">All Plans</SelectItem>
                            <SelectItem value="professional" className="font-sans text-sm">Professional</SelectItem>
                            <SelectItem value="enterprise" className="font-sans text-sm">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground font-mono">{filteredSubscribers.length}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    {loading && subscribers.length === 0 ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-eari-blue" />
                      </div>
                    ) : filteredSubscribers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Crown className="h-12 w-12 mb-3 opacity-30" />
                        <p className="font-sans text-sm">No subscribers found.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border hover:bg-transparent">
                              <TableHead className="text-muted-foreground font-sans font-medium pl-6">Email</TableHead>
                              <TableHead className="text-muted-foreground font-sans font-medium">Name</TableHead>
                              <TableHead className="text-muted-foreground font-sans font-medium">Organization</TableHead>
                              <TableHead className="text-muted-foreground font-sans font-medium">Plan</TableHead>
                              <TableHead className="text-muted-foreground font-sans font-medium text-right">Monthly</TableHead>
                              <TableHead className="text-muted-foreground font-sans font-medium">Status</TableHead>
                              <TableHead className="text-muted-foreground font-sans font-medium">Joined</TableHead>
                              <TableHead className="text-muted-foreground font-sans font-medium text-right pr-6">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredSubscribers.map((sub) => (
                              <TableRow key={sub.id} className="border-border group">
                                <TableCell className="pl-6">
                                  <span className="font-mono text-xs text-muted-foreground">{sub.email}</span>
                                </TableCell>
                                <TableCell>
                                  <span className="font-sans text-sm text-foreground">{sub.name || "—"}</span>
                                </TableCell>
                                <TableCell>
                                  <span className="font-sans text-xs text-muted-foreground">{sub.organization || "—"}</span>
                                </TableCell>
                                <TableCell>{tierBadge(sub.plan)}</TableCell>
                                <TableCell className="text-right">
                                  <span className="font-heading text-sm font-semibold text-foreground">{formatCurrency(sub.monthlyAmount)}</span>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-emerald/15 text-emerald border-emerald/25 text-[10px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald mr-1 inline-block" />
                                    Active
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="font-sans text-xs text-muted-foreground">{formatDate(sub.joinedDate)}</span>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  <Select
                                    value={sub.plan}
                                    onValueChange={(val) => handleTierChange(sub.id, val)}
                                    disabled={updatingUserId === sub.id}
                                  >
                                    <SelectTrigger size="sm" className="w-[120px] h-8 text-xs font-sans border-border bg-navy-700/50">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-navy-800 border-border">
                                      <SelectItem value="free" className="font-sans text-sm">Free</SelectItem>
                                      <SelectItem value="professional" className="font-sans text-sm">Pro</SelectItem>
                                      <SelectItem value="enterprise" className="font-sans text-sm">Enterprise</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Transactions */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Card className="bg-card/80 border-border">
                  <CardHeader>
                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-emerald" />
                      Recent Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    {loading && !revenueData ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-eari-blue" />
                      </div>
                    ) : (revenueData?.recentTransactions ?? []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Receipt className="h-12 w-12 mb-3 opacity-30" />
                        <p className="font-sans text-sm">No transactions yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border hover:bg-transparent">
                              <TableHead className="text-muted-foreground font-sans font-medium pl-6">User</TableHead>
                              <TableHead className="text-muted-foreground font-sans font-medium text-right">Amount</TableHead>
                              <TableHead className="text-muted-foreground font-sans font-medium">Plan</TableHead>
                              <TableHead className="text-muted-foreground font-sans font-medium">Date</TableHead>
                              <TableHead className="text-muted-foreground font-sans font-medium pr-6">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(revenueData?.recentTransactions ?? []).map((txn) => (
                              <TableRow key={txn.id} className="border-border">
                                <TableCell className="pl-6">
                                  <span className="font-mono text-xs text-muted-foreground">{txn.email}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="font-heading text-sm font-semibold text-foreground">{formatCurrency(txn.amount)}</span>
                                </TableCell>
                                <TableCell>{tierBadge(txn.plan)}</TableCell>
                                <TableCell>
                                  <span className="font-sans text-xs text-muted-foreground">{formatDate(txn.date)}</span>
                                </TableCell>
                                <TableCell className="pr-6">{transactionStatusBadge(txn.status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
             USERS TAB
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "users" && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-card/80 border-border">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                      <UserCog className="h-5 w-5 text-eari-blue" />
                      User Management
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <Select value={userTierFilter} onValueChange={setUserTierFilter}>
                        <SelectTrigger className="w-[130px] h-8 text-xs font-sans border-border bg-navy-700/50">
                          <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-navy-800 border-border">
                          <SelectItem value="all" className="font-sans text-sm">All Tiers</SelectItem>
                          <SelectItem value="free" className="font-sans text-sm">Free</SelectItem>
                          <SelectItem value="professional" className="font-sans text-sm">Professional</SelectItem>
                          <SelectItem value="enterprise" className="font-sans text-sm">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground font-mono">
                        {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
                      </span>
                      <Button size="sm" onClick={() => openEmailDialog(null)} className="h-8 text-xs font-sans bg-eari-blue hover:bg-eari-blue-dark text-white gap-1.5">
                        <Megaphone className="h-3.5 w-3.5" />
                        Broadcast
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  {loading && users.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-eari-blue" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <Users className="h-12 w-12 mb-3 opacity-30" />
                      <p className="font-sans text-sm">No users found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-muted-foreground font-sans font-medium pl-6">Name</TableHead>
                            <TableHead className="text-muted-foreground font-sans font-medium">Email</TableHead>
                            <TableHead className="text-muted-foreground font-sans font-medium">Tier</TableHead>
                            <TableHead className="text-muted-foreground font-sans font-medium">Role</TableHead>
                            <TableHead className="text-muted-foreground font-sans font-medium text-center">Assessments</TableHead>
                            <TableHead className="text-muted-foreground font-sans font-medium">Created</TableHead>
                            <TableHead className="text-muted-foreground font-sans font-medium text-right pr-6">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user) => (
                            <TableRow key={user.id} className="border-border group">
                              <TableCell className="pl-6">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-600 text-xs font-heading font-semibold text-foreground shrink-0">
                                    {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-sans text-sm font-medium text-foreground truncate max-w-[160px]">{user.name || "—"}</p>
                                    {user.organization && (
                                      <p className="text-xs text-muted-foreground font-sans truncate max-w-[160px]">{user.organization}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-xs text-muted-foreground">{user.email}</span>
                              </TableCell>
                              <TableCell>{tierBadge(user.tier)}</TableCell>
                              <TableCell>{roleBadge(user.role)}</TableCell>
                              <TableCell className="text-center">
                                <span className="font-heading text-sm font-semibold text-foreground">{user.assessmentCount}</span>
                              </TableCell>
                              <TableCell>
                                <span className="font-sans text-xs text-muted-foreground">{formatDate(user.createdAt)}</span>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex items-center justify-end gap-2">
                                  <Select
                                    value={user.tier}
                                    onValueChange={(val) => handleTierChange(user.id, val)}
                                    disabled={updatingUserId === user.id}
                                  >
                                    <SelectTrigger size="sm" className="w-[120px] h-8 text-xs font-sans border-border bg-navy-700/50">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-navy-800 border-border">
                                      <SelectItem value="free" className="font-sans text-sm">Free</SelectItem>
                                      <SelectItem value="professional" className="font-sans text-sm">Pro</SelectItem>
                                      <SelectItem value="enterprise" className="font-sans text-sm">Enterprise</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" disabled={updatingUserId === user.id} className="h-8 px-2 text-xs font-sans">
                                        {updatingUserId === user.id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <ChevronDown className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 bg-navy-800 border-border">
                                      <DropdownMenuItem
                                        onClick={() => { setSelectedUser(user); setShowUserDetails(true); }}
                                        className="font-sans cursor-pointer"
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEmailDialog(user)} className="font-sans cursor-pointer">
                                        <Mail className="h-4 w-4 mr-2" />
                                        Send Email
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleRoleToggle(user.id, user.role)} className="font-sans cursor-pointer">
                                        {user.role === "admin" ? (
                                          <><Users className="h-4 w-4 mr-2" />Remove Admin</>
                                        ) : (
                                          <><Shield className="h-4 w-4 mr-2" />Grant Admin</>
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                                        className="font-sans cursor-pointer text-destructive focus:text-destructive"
                                        disabled={session?.user?.id === user.id}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete User
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="bg-border" />
                                      <DropdownMenuItem disabled className="font-sans text-muted-foreground text-xs">
                                        User ID: {user.id.slice(0, 8)}...
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── User Details Dialog ─────────────────────────────────────── */}
          <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
            <DialogContent className="bg-navy-800 border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading text-lg flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-600 text-sm font-heading font-semibold text-foreground shrink-0">
                    {selectedUser?.name?.[0]?.toUpperCase() || selectedUser?.email?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-foreground">{selectedUser?.name || "Unknown"}</p>
                    <p className="text-xs font-mono text-muted-foreground font-normal">{selectedUser?.email}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              {selectedUser && (
                <div className="space-y-4 py-2">
                  {/* Current Plan */}
                  <div className="rounded-lg border border-border/50 bg-navy-700/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-heading text-sm font-semibold text-foreground">Current Plan</h4>
                      {tierBadge(selectedUser.tier)}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Role</p>
                        {roleBadge(selectedUser.role)}
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Organization</p>
                        <p className="font-sans text-sm text-foreground">{selectedUser.organization || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Joined</p>
                        <p className="font-sans text-sm text-foreground">{formatDate(selectedUser.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Assessments</p>
                        <p className="font-heading text-sm font-semibold text-foreground">{selectedUser.assessmentCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="rounded-lg border border-border/50 bg-navy-700/30 p-4">
                    <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-eari-blue" />
                      Quick Actions
                    </h4>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedUser.tier}
                        onValueChange={(val) => {
                          handleTierChange(selectedUser.id, val);
                          setSelectedUser({ ...selectedUser, tier: val });
                        }}
                        disabled={updatingUserId === selectedUser.id}
                      >
                        <SelectTrigger className="w-[150px] h-8 text-xs font-sans border-border bg-navy-700/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-navy-800 border-border">
                          <SelectItem value="free" className="font-sans text-sm">Free</SelectItem>
                          <SelectItem value="professional" className="font-sans text-sm">Pro (€49/mo)</SelectItem>
                          <SelectItem value="growth" className="font-sans text-sm">Growth (€149/mo)</SelectItem>
                          <SelectItem value="enterprise" className="font-sans text-sm">Enterprise (Custom)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleRoleToggle(selectedUser.id, selectedUser.role);
                          setSelectedUser({ ...selectedUser, role: selectedUser.role === "admin" ? "user" : "admin" });
                        }}
                        disabled={updatingUserId === selectedUser.id}
                        className="h-8 text-xs font-sans border-border"
                      >
                        <Shield className="h-3.5 w-3.5 mr-1" />
                        {selectedUser.role === "admin" ? "Remove Admin" : "Grant Admin"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowUserDetails(false); openEmailDialog(selectedUser); }}
                        className="h-8 text-xs font-sans border-eari-blue/40 text-eari-blue-light hover:bg-eari-blue/10"
                      >
                        <Mail className="h-3.5 w-3.5 mr-1" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(selectedUser.id, selectedUser.name || selectedUser.email)}
                        disabled={updatingUserId === selectedUser.id || session?.user?.id === selectedUser.id}
                        className="h-8 text-xs font-sans border-destructive/40 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete User
                      </Button>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="rounded-lg border border-border/50 bg-navy-700/30 p-4">
                    <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-emerald" />
                      Usage This Month
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Assessments</p>
                        <p className="font-heading text-2xl font-bold text-foreground">{selectedUser.assessmentCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Monthly Spend</p>
                        <p className="font-heading text-2xl font-bold text-foreground">
                          {selectedUser.tier === "enterprise" ? "Custom" : selectedUser.tier === "growth" ? "€149" : selectedUser.tier === "professional" ? "€49" : "€0"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* ═══════════════════════════════════════════════════════════════
             ASSESSMENTS TAB
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "assessments" && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-card/80 border-border">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-emerald" />
                      Assessment Management
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <Select value={assessmentFilter} onValueChange={setAssessmentFilter}>
                        <SelectTrigger className="w-[140px] h-8 text-xs font-sans border-border bg-navy-700/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-navy-800 border-border">
                          <SelectItem value="all" className="font-sans text-sm">All Statuses</SelectItem>
                          <SelectItem value="completed" className="font-sans text-sm">Completed</SelectItem>
                          <SelectItem value="draft" className="font-sans text-sm">Draft</SelectItem>
                          <SelectItem value="archived" className="font-sans text-sm">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground font-mono">{assessments.length} results</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  {loading && assessments.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-eari-blue" />
                    </div>
                  ) : assessments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <ClipboardList className="h-12 w-12 mb-3 opacity-30" />
                      <p className="font-sans text-sm">No assessments found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-muted-foreground font-sans font-medium pl-6">User</TableHead>
                            <TableHead className="text-muted-foreground font-sans font-medium">Status</TableHead>
                            <TableHead className="text-muted-foreground font-sans font-medium">Score</TableHead>
                            <TableHead className="text-muted-foreground font-sans font-medium">Maturity</TableHead>
                            <TableHead className="text-muted-foreground font-sans font-medium">Sector</TableHead>
                            <TableHead className="text-muted-foreground font-sans font-medium">Responses</TableHead>
                            <TableHead className="text-muted-foreground font-sans font-medium">Created</TableHead>
                            <TableHead className="text-muted-foreground font-sans font-medium text-right pr-6">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assessments.map((a) => (
                            <TableRow key={a.id} className="border-border group">
                              <TableCell className="pl-6">
                                <div className="min-w-0">
                                  <p className="font-sans text-sm font-medium text-foreground truncate max-w-[160px]">{a.user.name || a.user.email}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">{a.user.email}</span>
                                    {a.user.tier !== "free" && (
                                      <Badge className={`text-[8px] px-1 py-0 ${a.user.tier === "enterprise" ? "bg-gold/15 text-gold border-gold/20" : "bg-eari-blue/15 text-eari-blue-light border-eari-blue/20"} border`}>
                                        {a.user.tier === "enterprise" ? "ENT" : "PRO"}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{statusBadge(a.status)}</TableCell>
                              <TableCell>
                                {a.overallScore !== null ? (
                                  <span className="font-heading text-sm font-bold text-foreground">{Math.round(a.overallScore)}%</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-sans">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {a.maturityBand ? (
                                  <Badge className={`text-[10px] ${
                                    a.maturityBand === "laggard" ? "bg-red-500/15 text-red-400 border-red-500/25" :
                                    a.maturityBand === "follower" ? "bg-amber-500/15 text-amber-400 border-amber-500/25" :
                                    a.maturityBand === "chaser" ? "bg-blue-500/15 text-blue-400 border-blue-500/25" :
                                    "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                                  } border capitalize`}>
                                    {a.maturityBand}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-sans">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-xs text-muted-foreground capitalize">{a.sector}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-heading text-sm font-semibold text-foreground">{a.responseCount}</span>
                              </TableCell>
                              <TableCell>
                                <span className="font-sans text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Link href={`/results/${a.id}`}>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-sans">
                                      <Eye className="h-3.5 w-3.5 mr-1" />
                                      View
                                    </Button>
                                  </Link>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-sans">
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 bg-navy-800 border-border">
                                      {a.status !== "archived" && (
                                        <DropdownMenuItem onClick={() => handleAssessmentStatus(a.id, "archived")} className="font-sans cursor-pointer">
                                          <Archive className="h-4 w-4 mr-2" />
                                          Archive
                                        </DropdownMenuItem>
                                      )}
                                      {a.status === "archived" && (
                                        <DropdownMenuItem onClick={() => handleAssessmentStatus(a.id, "completed")} className="font-sans cursor-pointer">
                                          <CheckCircle2 className="h-4 w-4 mr-2" />
                                          Restore
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator className="bg-border" />
                                      <DropdownMenuItem disabled className="font-sans text-muted-foreground text-xs">
                                        ID: {a.id.slice(0, 8)}...
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
             AGENTS TAB
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "agents" && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Agent status header */}
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                  <Brain className="h-5 w-5 text-eari-blue" />
                  Agent Fleet Monitoring
                </h3>
                <Badge variant="outline" className="font-mono text-[10px] border-border text-muted-foreground">
                  v5.3 · 6 agents · Live
                </Badge>
              </div>

              {/* ─── Fleet Overview Bar ────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-card/60 border-border/40">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Operational</p>
                    <p className="font-heading text-2xl font-bold text-emerald-400">{AGENT_STATUS.filter(a => a.status === "operational").length}<span className="text-sm text-muted-foreground">/{AGENT_STATUS.length}</span></p>
                  </CardContent>
                </Card>
                <Card className="bg-card/60 border-border/40">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Degraded</p>
                    <p className="font-heading text-2xl font-bold text-amber-400">{AGENT_STATUS.filter(a => a.status === "degraded" || a.status === "partial").length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/60 border-border/40">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Avg Response</p>
                    <p className="font-heading text-2xl font-bold text-eari-blue-light">{Math.round(AGENT_STATUS.reduce((s, a) => s + a.avgLatency, 0) / AGENT_STATUS.length)}<span className="text-sm text-muted-foreground">ms</span></p>
                  </CardContent>
                </Card>
                <Card className="bg-card/60 border-border/40">
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">24h Requests</p>
                    <p className="font-heading text-2xl font-bold text-cyan-400">{(AGENT_STATUS.reduce((s, a) => s + a.requests24h, 0) / 1000).toFixed(1)}<span className="text-sm text-muted-foreground">k</span></p>
                  </CardContent>
                </Card>
              </div>

              {/* ─── Agent Detail Cards ─────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {AGENT_STATUS.map((agent, i) => {
                  const AgentIcon = agent.icon;
                  // Generate sparkline data from agent id
                  const sparkPoints = Array.from({ length: 24 }, (_, j) => {
                    const base = agent.requests24h / 24;
                    const variance = base * 0.4 * Math.sin((i * 7 + j * 3.7) * 0.5);
                    return base + variance;
                  });
                  const sparkMin = Math.min(...sparkPoints);
                  const sparkMax = Math.max(...sparkPoints);
                  const sparkRange = sparkMax - sparkMin || 1;
                  const sparkWidth = 120;
                  const sparkHeight = 28;
                  const sparkPath = sparkPoints.map((v, j) => `${j === 0 ? 'M' : 'L'}${(j / (sparkPoints.length - 1)) * sparkWidth},${sparkHeight - ((v - sparkMin) / sparkRange) * sparkHeight}`).join(' ');

                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                    >
                      <Card className="bg-card/80 border-border/60 hover:border-border transition-all duration-300 hover-lift">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Icon with heartbeat pulse ring */}
                            <div className="relative flex-shrink-0">
                              <div
                                className="absolute -inset-1.5 rounded-xl opacity-30 animate-pulse"
                                style={{ backgroundColor: agent.color, animationDuration: agent.status === 'operational' ? '2s' : '1s' }}
                              />
                              <div
                                className="relative flex h-11 w-11 items-center justify-center rounded-lg"
                                style={{ backgroundColor: `${agent.color}15` }}
                              >
                                <AgentIcon className="h-5 w-5" style={{ color: agent.color }} />
                              </div>
                            </div>

                            {/* Agent info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="font-heading text-sm text-foreground">{agent.name}</CardTitle>
                                  <span className="font-mono text-[10px] text-muted-foreground">v{agent.version}</span>
                                </div>
                                {agentStatusBadge(agent.status)}
                              </div>
                              <p className="text-[11px] text-muted-foreground font-sans leading-relaxed mb-3">{agent.description}</p>

                              {/* Metrics grid */}
                              <div className="grid grid-cols-3 gap-2 mb-3">
                                <div className="p-1.5 rounded bg-navy-800/50 text-center">
                                  <p className="text-[9px] font-mono text-muted-foreground">Avg Latency</p>
                                  <p className="font-heading text-xs font-semibold" style={{ color: agent.avgLatency < 300 ? '#10b981' : agent.avgLatency < 800 ? '#f59e0b' : '#ef4444' }}>{agent.avgLatency}ms</p>
                                </div>
                                <div className="p-1.5 rounded bg-navy-800/50 text-center">
                                  <p className="text-[9px] font-mono text-muted-foreground">P99</p>
                                  <p className="font-heading text-xs font-semibold" style={{ color: agent.p99Latency < 1000 ? '#10b981' : agent.p99Latency < 2500 ? '#f59e0b' : '#ef4444' }}>{agent.p99Latency >= 1000 ? `${(agent.p99Latency / 1000).toFixed(1)}s` : `${agent.p99Latency}ms`}</p>
                                </div>
                                <div className="p-1.5 rounded bg-navy-800/50 text-center">
                                  <p className="text-[9px] font-mono text-muted-foreground">Error Rate</p>
                                  <p className="font-heading text-xs font-semibold" style={{ color: agent.errorRate < 1 ? '#10b981' : agent.errorRate < 2 ? '#f59e0b' : '#ef4444' }}>{agent.errorRate}%</p>
                                </div>
                              </div>

                              {/* CPU & Memory bars */}
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                  <div className="flex justify-between mb-0.5">
                                    <span className="text-[9px] font-mono text-muted-foreground">CPU</span>
                                    <span className="text-[9px] font-mono" style={{ color: agent.cpu < 50 ? '#10b981' : agent.cpu < 70 ? '#f59e0b' : '#ef4444' }}>{agent.cpu}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${agent.cpu}%`, backgroundColor: agent.cpu < 50 ? '#10b981' : agent.cpu < 70 ? '#f59e0b' : '#ef4444' }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between mb-0.5">
                                    <span className="text-[9px] font-mono text-muted-foreground">Memory</span>
                                    <span className="text-[9px] font-mono" style={{ color: agent.memory < 60 ? '#10b981' : agent.memory < 80 ? '#f59e0b' : '#ef4444' }}>{agent.memory}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${agent.memory}%`, backgroundColor: agent.memory < 60 ? '#10b981' : agent.memory < 80 ? '#f59e0b' : '#ef4444' }} />
                                  </div>
                                </div>
                              </div>

                              {/* Traffic sparkline + footer */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <svg width={sparkWidth} height={sparkHeight} className="opacity-60">
                                    <path d={sparkPath} fill="none" stroke={agent.color} strokeWidth="1.5" />
                                  </svg>
                                  <span className="text-[9px] font-mono text-muted-foreground">{agent.requests24h}/24h</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {agent.lastIncident && (
                                    <span className="text-[9px] font-mono text-red-400/70">Incident: {agent.lastIncident}</span>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: agent.status === "operational" ? "#10b981" : agent.status === "degraded" ? "#f59e0b" : agent.status === "partial" ? "#06b6d4" : "#ef4444" }} />
                                    <span className="font-mono text-[10px] text-muted-foreground">{agent.uptime}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* System info card */}
              <Card className="bg-card/80 border-border/60">
                <CardHeader>
                  <CardTitle className="font-heading text-sm text-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Scoring Engine</p>
                      <p className="font-heading text-sm font-semibold text-foreground">Deterministic v5.3</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">LLM Provider</p>
                      <p className="font-heading text-sm font-semibold text-foreground">z-ai-web-dev-sdk</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Payment</p>
                      <p className="font-heading text-sm font-semibold text-foreground">Stripe (Test Mode)</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Database</p>
                      <p className="font-heading text-sm font-semibold text-foreground">SQLite / Prisma</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
             REFUNDS TAB
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "refunds" && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground">Refund Management</h2>
                  <p className="text-sm text-muted-foreground font-sans mt-1">Review, approve, or reject user refund requests</p>
                </div>
                <Link href="/admin/refunds">
                  <Button className="bg-eari-blue hover:bg-eari-blue-dark text-white font-sans">
                    Open Full Refund Panel
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>

              <Card className="bg-card/80 border-amber-500/20">
                <CardHeader>
                  <CardTitle className="font-heading text-lg text-foreground flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-amber-400" />
                    Quick Refund Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 mx-auto mb-4">
                      <RotateCcw className="h-7 w-7 text-amber-400" />
                    </div>
                    <p className="text-muted-foreground font-sans text-sm mb-4">
                      For the full refund management interface with filtering, approve/reject dialogs, and Stripe integration, use the dedicated refunds page.
                    </p>
                    <Link href="/admin/refunds">
                      <Button className="bg-amber-500 hover:bg-amber-600 text-white font-sans">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Manage Refunds
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
             INBOX TAB
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "inbox" && (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-5">

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                    <Mail className="h-5 w-5 text-eari-blue" />
                    Contact Inbox
                    {inboxMessages.filter((m) => m.status === "new").length > 0 && (
                      <span className="ml-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-eari-blue text-[10px] font-bold text-white">
                        {inboxMessages.filter((m) => m.status === "new").length}
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground font-sans mt-0.5">Messages submitted through the contact form</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { fetchInbox(inboxStatusFilter !== "all" ? inboxStatusFilter : undefined); }}
                  className="font-sans border-border text-muted-foreground hover:text-foreground h-8 text-xs gap-1.5 self-start sm:self-auto"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total", count: inboxMessages.length, color: "text-foreground", bg: "bg-navy-700/40", border: "border-border/40" },
                  { label: "New", count: inboxMessages.filter((m) => m.status === "new").length, color: "text-eari-blue-light", bg: "bg-eari-blue/8", border: "border-eari-blue/20" },
                  { label: "Replied", count: inboxMessages.filter((m) => m.status === "replied").length, color: "text-emerald", bg: "bg-emerald/8", border: "border-emerald/20" },
                  { label: "Archived", count: inboxMessages.filter((m) => m.status === "archived").length, color: "text-muted-foreground", bg: "bg-navy-700/20", border: "border-border/30" },
                ].map(({ label, count, color, bg, border }) => (
                  <div key={label} className={`rounded-lg border ${border} ${bg} px-4 py-3`}>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                    <p className={`font-heading text-2xl font-bold ${color}`}>{count}</p>
                  </div>
                ))}
              </div>

              {/* Status filter pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["all", "new", "read", "replied", "archived"] as const).map((s) => {
                  const counts: Record<string, number> = {
                    all: inboxMessages.length,
                    new: inboxMessages.filter((m) => m.status === "new").length,
                    read: inboxMessages.filter((m) => m.status === "read").length,
                    replied: inboxMessages.filter((m) => m.status === "replied").length,
                    archived: inboxMessages.filter((m) => m.status === "archived").length,
                  };
                  return (
                    <button
                      key={s}
                      onClick={() => { setInboxStatusFilter(s); fetchInbox(s !== "all" ? s : undefined); setSelectedMessage(null); }}
                      className={`px-3 py-1 rounded-full text-xs font-sans transition-colors ${inboxStatusFilter === s ? "bg-eari-blue text-white shadow-sm" : "bg-navy-700/50 border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70"}`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}{" "}
                      <span className={`ml-0.5 ${inboxStatusFilter === s ? "opacity-80" : "opacity-50"}`}>({counts[s]})</span>
                    </button>
                  );
                })}
              </div>

              {/* Split pane */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: 580 }}>

                {/* Message list */}
                <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/80 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                    <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
                      {inboxMessages.length} message{inboxMessages.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {inboxMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-16 text-muted-foreground gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-700/50 border border-border/40">
                        <Mail className="h-6 w-6 opacity-30" />
                      </div>
                      <div className="text-center">
                        <p className="font-sans text-sm font-medium">No messages</p>
                        <p className="font-sans text-xs text-muted-foreground/60 mt-0.5">Messages from the contact form will appear here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-y-auto flex-1">
                      {inboxMessages.map((msg) => {
                        const isSelected = selectedMessage?.id === msg.id;
                        const isNew = msg.status === "new";
                        return (
                          <button
                            key={msg.id}
                            onClick={() => handleSelectMessage(msg)}
                            className={`w-full text-left px-4 py-4 transition-all border-b border-border/30 last:border-b-0 relative ${isSelected ? "bg-eari-blue/8 border-l-[3px] border-l-eari-blue pl-[13px]" : "hover:bg-navy-700/30 border-l-[3px] border-l-transparent"}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-heading font-semibold ${isNew ? "bg-eari-blue/25 text-eari-blue-light ring-1 ring-eari-blue/40" : isSelected ? "bg-eari-blue/15 text-eari-blue-light" : "bg-navy-600/80 text-foreground/70"}`}>
                                {msg.name[0]?.toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2 mb-0.5">
                                  <p className={`font-sans text-sm truncate leading-tight ${isNew ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                                    {msg.name}
                                  </p>
                                  <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5">
                                    {new Date(msg.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                </div>
                                <p className={`font-sans text-xs truncate mb-1 ${isNew ? "text-foreground/75 font-medium" : "text-muted-foreground"}`}>
                                  {msg.subject}
                                </p>
                                <p className="font-sans text-[11px] text-muted-foreground/55 truncate leading-snug mb-2">
                                  {msg.message.slice(0, 65)}{msg.message.length > 65 ? "…" : ""}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  {isNew && (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-eari-blue/15 text-eari-blue-light font-mono border border-eari-blue/20">
                                      <span className="h-1.5 w-1.5 rounded-full bg-eari-blue animate-pulse" />
                                      NEW
                                    </span>
                                  )}
                                  {msg.status === "replied" && (
                                    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-emerald/10 text-emerald border border-emerald/20 font-mono">
                                      REPLIED
                                    </span>
                                  )}
                                  {msg.status === "read" && (
                                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-navy-600/60 text-muted-foreground/70 font-mono">
                                      READ
                                    </span>
                                  )}
                                  {msg.status === "archived" && (
                                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-navy-600/40 text-muted-foreground/50 font-mono">
                                      ARCHIVED
                                    </span>
                                  )}
                                  {msg.replies.length > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-navy-600/60 text-muted-foreground font-mono">
                                      <MessageSquare className="h-2.5 w-2.5" />
                                      {msg.replies.length}
                                    </span>
                                  )}
                                  {msg.company && (
                                    <span className="text-[10px] font-sans text-muted-foreground/50 truncate">· {msg.company}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Message detail */}
                <div className="lg:col-span-3 rounded-xl border border-border/50 bg-card/80 flex flex-col overflow-hidden">
                  {!selectedMessage ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-16 text-muted-foreground gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-700/50 border border-border/40">
                        <MessageSquare className="h-7 w-7 opacity-25" />
                      </div>
                      <div className="text-center">
                        <p className="font-sans text-sm font-medium">No message selected</p>
                        <p className="font-sans text-xs text-muted-foreground/60 mt-1">Choose a message from the list to read and reply</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col flex-1 overflow-hidden">

                      {/* Message header */}
                      <div className="px-6 py-4 border-b border-border/40 bg-navy-800/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-heading font-semibold text-base text-foreground leading-tight mb-2">{selectedMessage.subject}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-600 text-[10px] font-heading font-semibold text-foreground">
                                {selectedMessage.name[0]?.toUpperCase()}
                              </div>
                              <span className="font-sans text-sm font-medium text-foreground/90">{selectedMessage.name}</span>
                              <span className="text-muted-foreground/30">·</span>
                              <a href={`mailto:${selectedMessage.email}`} className="font-mono text-xs text-eari-blue-light hover:underline underline-offset-2">
                                {selectedMessage.email}
                              </a>
                              {selectedMessage.company && (
                                <>
                                  <span className="text-muted-foreground/30">·</span>
                                  <span className="font-sans text-xs text-muted-foreground bg-navy-600/60 px-2 py-0.5 rounded-full">{selectedMessage.company}</span>
                                </>
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-muted-foreground mt-2">
                              Received {new Date(selectedMessage.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {selectedMessage.status !== "archived" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchiveMessage(selectedMessage.id)}
                                className="h-7 px-2.5 text-xs font-sans text-muted-foreground hover:text-foreground hover:bg-navy-700/60 gap-1"
                              >
                                <Archive className="h-3.5 w-3.5" />
                                Archive
                              </Button>
                            ) : (
                              <span className="text-[10px] font-mono text-muted-foreground/60 px-2 py-1 rounded-md bg-navy-700/30">Archived</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Thread */}
                      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        {/* Original message bubble */}
                        <div className="rounded-xl border border-border/40 bg-navy-700/30 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-500/80 border border-border/40 text-[11px] font-heading font-semibold text-foreground">
                                {selectedMessage.name[0]?.toUpperCase()}
                              </div>
                              <div>
                                <span className="font-sans text-xs font-semibold text-foreground">{selectedMessage.name}</span>
                                {selectedMessage.email && (
                                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">{selectedMessage.email}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {new Date(selectedMessage.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>
                          <p className="font-sans text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{selectedMessage.message}</p>
                        </div>

                        {/* Reply bubbles */}
                        {selectedMessage.replies.map((reply) => (
                          <div key={reply.id} className="rounded-xl border border-eari-blue/25 bg-eari-blue/8 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-eari-blue/30 border border-eari-blue/30 text-[11px] font-heading font-semibold text-eari-blue-light">
                                  A
                                </div>
                                <div>
                                  <span className="font-sans text-xs font-semibold text-eari-blue-light">You (Admin)</span>
                                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">hello@e-ari.com</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {new Date(reply.sentAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                              </span>
                            </div>
                            <div className="mb-2 flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-muted-foreground/60 bg-navy-700/40 px-2 py-0.5 rounded">
                                Re: {reply.subject}
                              </span>
                            </div>
                            <p className="font-sans text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                          </div>
                        ))}
                      </div>

                      {/* Reply compose */}
                      {selectedMessage.status !== "archived" ? (
                        <div className="border-t border-border/40 bg-navy-800/20 px-6 py-4 space-y-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Send className="h-3.5 w-3.5 text-eari-blue-light" />
                            <p className="font-sans text-xs font-semibold text-foreground">
                              Reply to {selectedMessage.name}
                            </p>
                          </div>
                          <Input
                            value={replySubject}
                            onChange={(e) => setReplySubject(e.target.value)}
                            placeholder="Email subject…"
                            className="font-sans border-border/60 bg-navy-700/50 text-sm h-9 focus:border-eari-blue/50 focus:ring-eari-blue/20"
                          />
                          <Textarea
                            value={replyBody}
                            onChange={(e) => setReplyBody(e.target.value)}
                            placeholder={`Write your reply to ${selectedMessage.name}…`}
                            rows={5}
                            className="font-sans border-border/60 bg-navy-700/50 text-sm resize-none focus:border-eari-blue/50 focus:ring-eari-blue/20 leading-relaxed"
                          />
                          {replyResult && (
                            <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-sans ${replyResult.success ? "bg-emerald/8 text-emerald border border-emerald/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                              {replyResult.success ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0" />}
                              {replyResult.message}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1">
                            <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
                              <Mail className="h-3 w-3" />
                              Sent from hello@e-ari.com
                            </p>
                            <Button
                              size="sm"
                              onClick={handleSendReply}
                              disabled={replySending || !replyBody.trim() || !replySubject.trim()}
                              className="font-sans bg-eari-blue hover:bg-eari-blue-dark text-white text-xs h-8 px-4 gap-1.5 disabled:opacity-50"
                            >
                              {replySending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                              {replySending ? "Sending…" : "Send Reply"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-border/40 px-6 py-4 flex items-center gap-2 text-muted-foreground/60">
                          <Archive className="h-3.5 w-3.5" />
                          <p className="font-sans text-xs">This conversation is archived. Replies are disabled.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
             SOCIAL TAB
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === "social" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Social Media Automation</h2>
                  <p className="text-slate-500 mt-1">Schedule posts, auto-generate content, and manage social accounts</p>
                </div>
                <Link href="/admin/social">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Share2 className="h-4 w-4 mr-2" />
                    Open Social Hub
                  </Button>
                </Link>
              </div>

              {/* Quick stats cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-card/80 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-sans font-medium text-muted-foreground flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100">
                        <FileEdit className="h-4 w-4 text-slate-600" />
                      </div>
                      Total Posts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="font-heading text-3xl font-bold text-foreground">
                      {posts.length}
                    </span>
                  </CardContent>
                </Card>
                <Card className="bg-card/80 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-sans font-medium text-muted-foreground flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10">
                        <CalendarDays className="h-4 w-4 text-amber-500" />
                      </div>
                      Scheduled
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="font-heading text-3xl font-bold text-amber-500">
                      {posts.filter((p) => p.status === "scheduled").length}
                    </span>
                  </CardContent>
                </Card>
                <Card className="bg-card/80 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-sans font-medium text-muted-foreground flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald/10">
                        <CheckCircle2 className="h-4 w-4 text-emerald" />
                      </div>
                      Published This Week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="font-heading text-3xl font-bold text-emerald">
                      {posts.filter((p) => p.status === "published").length}
                    </span>
                  </CardContent>
                </Card>
                <Card className="bg-card/80 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-sans font-medium text-muted-foreground flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-eari-blue/10">
                        <Share2 className="h-4 w-4 text-eari-blue" />
                      </div>
                      Connected Accounts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="font-heading text-3xl font-bold text-eari-blue-light">
                      {socialAccounts.length}
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Recent social posts */}
              <Card className="bg-card/80 border-border">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-emerald-500" />
                    Recent Posts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {posts.length === 0 ? (
                    <p className="text-muted-foreground font-sans text-sm text-center py-8">
                      No social posts yet. Open the Social Hub to create your first post.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {posts.slice(0, 5).map((post) => (
                        <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-navy-700/30">
                          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: post.platform === "linkedin" ? "#0A66C215" : post.platform === "twitter" ? "#00000015" : "#1877F215" }}>
                            {post.platform === "linkedin" ? <span className="text-xs font-bold" style={{ color: "#0A66C2" }}>in</span> : post.platform === "twitter" ? <span className="text-xs font-bold" style={{ color: "#000" }}>𝕏</span> : <span className="text-xs font-bold" style={{ color: "#1877F2" }}>f</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground truncate">{post.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={
                                post.status === "published" ? "bg-emerald/15 text-emerald border-emerald/25 text-[10px]" :
                                post.status === "scheduled" ? "bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px]" :
                                post.status === "failed" ? "bg-red-500/15 text-red-400 border-red-500/25 text-[10px]" :
                                "bg-slate/15 text-slate border-slate/25 text-[10px]"
                              }>
                                {post.status === "published" && <CheckCircle2 className="h-2.5 w-2.5 mr-1" />}
                                {post.status === "scheduled" && <CalendarDays className="h-2.5 w-2.5 mr-1" />}
                                {post.status}
                              </Badge>
                              {post.autoGenerated && (
                                <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/25 text-[10px]">AI</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
             SETTINGS TAB
             ═══════════════════════════════════════════════════════════════ */}
          {/* ─── Email Compose Dialog ──────────────────────────────────── */}
          <Dialog open={showEmailDialog} onOpenChange={(open) => { setShowEmailDialog(open); if (!open) setEmailResult(null); }}>
            <DialogContent className="bg-navy-800 border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading text-lg flex items-center gap-2">
                  {emailTarget ? (
                    <>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-eari-blue/20 text-xs font-heading font-semibold text-eari-blue-light shrink-0">
                        {emailTarget.name?.[0]?.toUpperCase() || emailTarget.email[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-foreground text-base">Email {emailTarget.name || emailTarget.email}</p>
                        <p className="text-xs font-mono text-muted-foreground font-normal">{emailTarget.email}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-eari-blue/20 shrink-0">
                        <Megaphone className="h-4 w-4 text-eari-blue-light" />
                      </div>
                      <p className="text-foreground text-base">Broadcast Email</p>
                    </>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {!emailTarget && (
                  <div className="space-y-1.5">
                    <Label className="font-sans text-xs text-muted-foreground uppercase tracking-wider">Send to</Label>
                    <Select value={emailBroadcastTier} onValueChange={setEmailBroadcastTier}>
                      <SelectTrigger className="font-sans border-border bg-navy-700/60 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-navy-800 border-border">
                        <SelectItem value="all" className="font-sans">All Users ({users.length})</SelectItem>
                        <SelectItem value="free" className="font-sans">Free Tier ({users.filter(u => u.tier === "free").length})</SelectItem>
                        <SelectItem value="professional" className="font-sans">Professional Tier ({users.filter(u => u.tier === "professional").length})</SelectItem>
                        <SelectItem value="enterprise" className="font-sans">Enterprise Tier ({users.filter(u => u.tier === "enterprise").length})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="font-sans text-xs text-muted-foreground uppercase tracking-wider">Subject</Label>
                  <Input
                    placeholder="Email subject…"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="font-sans border-border bg-navy-700/60 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-sans text-xs text-muted-foreground uppercase tracking-wider">Message</Label>
                  <Textarea
                    placeholder="Write your message…"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={6}
                    className="font-sans border-border bg-navy-700/60 text-sm resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground font-sans">Sent from hello@e-ari.com · Rendered with E-ARI branded email template</p>
                </div>
                {emailResult && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-sans ${emailResult.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                    {emailResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
                    {emailResult.message}
                  </div>
                )}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(false)} className="font-sans border-border text-sm" disabled={emailSending}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendEmail}
                    disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                    className="font-sans bg-eari-blue hover:bg-eari-blue-dark text-white text-sm gap-1.5"
                  >
                    {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {emailSending ? "Sending…" : emailTarget ? "Send Email" : "Broadcast"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {activeTab === "compliance" && (
            <div className="space-y-6">
              <Card className="bg-card/80 border-border/40">
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between space-y-0">
                  <div>
                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                      <ScrollText className="h-5 w-5 text-eari-blue-light" />
                      Compliance LLM logs
                    </CardTitle>
                    <p className="text-sm text-muted-foreground font-sans mt-1">
                      Observability for compliance automation calls — no document content or PII.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-sans">
                        Operation
                      </Label>
                      <Input
                        placeholder="e.g. clause_extract"
                        value={complianceLogsOpDraft}
                        onChange={(e) => setComplianceLogsOpDraft(e.target.value)}
                        className="w-[200px] font-mono text-xs bg-navy-700/60 border-border"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-sans">
                        Success
                      </Label>
                      <Select
                        value={complianceLogsSuccessFilter}
                        onValueChange={(v) => {
                          setComplianceLogsSuccessFilter(v as "all" | "true" | "false");
                          setComplianceLogsPage(0);
                        }}
                      >
                        <SelectTrigger className="w-[140px] font-sans text-sm bg-navy-700/60 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="true">Success only</SelectItem>
                          <SelectItem value="false">Failures only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="font-sans bg-navy-700/80"
                      onClick={() => {
                        setComplianceLogsOpApplied(complianceLogsOpDraft.trim());
                        setComplianceLogsPage(0);
                      }}
                    >
                      Apply filters
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="font-sans border-border gap-1"
                      onClick={() => void fetchComplianceLogs()}
                      disabled={complianceLogsLoading}
                    >
                      {complianceLogsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-muted-foreground">
                    <span>
                      {complianceLogsTotal.toLocaleString()} total · page {complianceLogsPage + 1} of{" "}
                      {Math.max(1, Math.ceil(complianceLogsTotal / 50))} · showing{" "}
                      {complianceLogs.length} rows
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={complianceLogsPage <= 0 || complianceLogsLoading}
                        onClick={() => setComplianceLogsPage((p) => Math.max(0, p - 1))}
                        className="font-sans border-border h-8"
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          complianceLogsLoading ||
                          (complianceLogsPage + 1) * 50 >= complianceLogsTotal
                        }
                        onClick={() => setComplianceLogsPage((p) => p + 1)}
                        className="font-sans border-border h-8"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/40 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/40 hover:bg-transparent">
                          <TableHead className="font-heading text-xs whitespace-nowrap">Time</TableHead>
                          <TableHead className="font-heading text-xs whitespace-nowrap">Operation</TableHead>
                          <TableHead className="font-heading text-xs whitespace-nowrap">Model</TableHead>
                          <TableHead className="font-heading text-xs whitespace-nowrap text-right">
                            ms
                          </TableHead>
                          <TableHead className="font-heading text-xs whitespace-nowrap text-right">
                            In/out tok
                          </TableHead>
                          <TableHead className="font-heading text-xs whitespace-nowrap">OK</TableHead>
                          <TableHead className="font-heading text-xs whitespace-nowrap">Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {complianceLogsLoading && complianceLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-12 text-center">
                              <Loader2 className="h-8 w-8 animate-spin text-eari-blue mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : complianceLogs.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="py-10 text-center text-muted-foreground font-sans text-sm"
                            >
                              No compliance logs yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          complianceLogs.map((row) => (
                            <TableRow key={row.id} className="border-border/40">
                              <TableCell className="font-mono text-[11px] whitespace-nowrap">
                                {new Date(row.createdAt).toLocaleString()}
                              </TableCell>
                              <TableCell className="font-mono text-[11px] max-w-[140px] truncate">
                                {row.operation ?? "—"}
                              </TableCell>
                              <TableCell className="font-mono text-[11px] max-w-[160px] truncate">
                                {row.model}
                              </TableCell>
                              <TableCell className="font-mono text-[11px] text-right">
                                {row.durationMs}
                              </TableCell>
                              <TableCell className="font-mono text-[11px] text-right whitespace-nowrap">
                                {row.inputTokens ?? "—"} / {row.outputTokens ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {row.success ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 font-mono">
                                    yes
                                  </Badge>
                                ) : (
                                  <Badge className="bg-destructive/15 text-destructive border-destructive/25 font-mono">
                                    no
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-[11px] max-w-[180px] truncate text-muted-foreground">
                                {row.errorClass ?? "—"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "settings" && (
            <SettingsTab />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
