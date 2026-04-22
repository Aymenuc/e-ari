'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  SkipForward,
  Clock,
  RefreshCw,
  Brain,
  Lightbulb,
  Search,
  BarChart3,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle,
  Activity,
  Timer,
  Layers,
  CircleDot,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type AgentId = 'scoring' | 'insight' | 'discovery' | 'report' | 'assistant' | 'literacy';
type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
type PipelineStatusType = 'pending' | 'running' | 'completed' | 'failed' | 'partial' | 'none';

interface StageInfo {
  agent: string;
  status: StageStatus;
  durationMs: number | null;
  error: string | null;
  result?: string;
}

interface PipelineRunInfo {
  id: string;
  status: PipelineStatusType;
  stages: StageInfo[];
  startedAt: string | null;
  completedAt: string | null;
  totalDurationMs: number | null;
}

interface PipelineStatusProps {
  assessmentId: string;
  /** Auto-poll while pipeline is running */
  autoPoll?: boolean;
  /** Poll interval in ms (default: 3000) */
  pollInterval?: number;
  className?: string;
}

// ─── Agent Metadata ─────────────────────────────────────────────────────────

const AGENT_META: Record<AgentId, {
  label: string;
  icon: React.ElementType;
  color: string;
  colorLight: string;
  description: string;
  role: string;
  gradient: string;
}> = {
  scoring: {
    label: 'Scoring',
    icon: Brain,
    color: '#3b82f6',
    colorLight: '#60a5fa',
    description: 'Computing pillar scores & maturity band',
    role: 'Score computation engine',
    gradient: 'from-blue-500 to-blue-600',
  },
  insight: {
    label: 'Insight',
    icon: Lightbulb,
    color: '#8b5cf6',
    colorLight: '#a78bfa',
    description: 'Generating strategic AI insights',
    role: 'Strategic insight analyst',
    gradient: 'from-purple-500 to-purple-600',
  },
  discovery: {
    label: 'Discovery',
    icon: Search,
    color: '#06b6d4',
    colorLight: '#22d3ee',
    description: 'Mapping AI landscape & gaps',
    role: 'Landscape discovery scanner',
    gradient: 'from-cyan-500 to-cyan-600',
  },
  report: {
    label: 'Report',
    icon: BarChart3,
    color: '#10b981',
    colorLight: '#34d399',
    description: 'Compiling roadmap, benchmark & recommendations',
    role: 'Report compilation agent',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  literacy: {
    label: 'Literacy',
    icon: BookOpen,
    color: '#f59e0b',
    colorLight: '#fbbf24',
    description: 'Assessing AI literacy level',
    role: 'Literacy assessment engine',
    gradient: 'from-amber-500 to-amber-600',
  },
  assistant: {
    label: 'Assistant',
    icon: Bot,
    color: '#6366f1',
    colorLight: '#818cf8',
    description: 'Available for interactive Q&A',
    role: 'Interactive AI assistant',
    gradient: 'from-indigo-500 to-indigo-600',
  },
};

// Pipeline flow order (excluding assistant, which runs on-demand)
const PIPELINE_FLOW: AgentId[] = ['scoring', 'insight', 'discovery', 'report', 'literacy'];

// ─── SVG Flow Diagram Component ─────────────────────────────────────────────

function PipelineFlowDiagram({
  stages,
  expandedAgent,
  onNodeClick,
  onRetry,
  retrying,
}: {
  stages: StageInfo[];
  expandedAgent: AgentId | null;
  onNodeClick: (agent: AgentId) => void;
  onRetry: (agent: AgentId) => void;
  retrying: AgentId | null;
}) {
  const stageMap = useMemo(() => {
    const map: Record<string, StageInfo> = {};
    stages.forEach(s => { map[s.agent] = s; });
    return map;
  }, [stages]);

  // Node positions in SVG coordinates
  // Scoring → Insight ∥ Discovery → Report → Literacy
  const nodePositions: Record<AgentId, { x: number; y: number }> = {
    scoring:   { x: 80,  y: 70 },
    insight:   { x: 250, y: 35 },
    discovery: { x: 250, y: 105 },
    report:    { x: 420, y: 70 },
    literacy:  { x: 590, y: 70 },
    assistant: { x: -100, y: -100 }, // off-canvas, assistant is on-demand
  };

  const nodeRadius = 32;

  // Connector paths
  const connectors = [
    { from: 'scoring', to: 'insight', path: 'M112,70 C160,70 190,35 218,35' },
    { from: 'scoring', to: 'discovery', path: 'M112,70 C160,70 190,105 218,105' },
    { from: 'insight', to: 'report', path: 'M282,35 C330,35 360,70 388,70' },
    { from: 'discovery', to: 'report', path: 'M282,105 C330,105 360,70 388,70' },
    { from: 'report', to: 'literacy', path: 'M452,70 C500,70 530,70 558,70' },
  ];

  const getNodeStatus = (agentId: AgentId): StageStatus => {
    return stageMap[agentId]?.status ?? 'pending';
  };

  const isUpstreamComplete = (agentId: AgentId): boolean => {
    const idx = PIPELINE_FLOW.indexOf(agentId);
    if (idx <= 0) return true;
    const prev = PIPELINE_FLOW[idx - 1];
    // For insight/discovery, check scoring
    if (agentId === 'insight' || agentId === 'discovery') {
      return getNodeStatus('scoring') === 'completed';
    }
    if (agentId === 'report') {
      return getNodeStatus('insight') === 'completed' && getNodeStatus('discovery') === 'completed';
    }
    return getNodeStatus(prev) === 'completed';
  };

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox="0 0 670 145"
        className="w-full min-w-[500px] max-w-[800px] mx-auto"
        style={{ height: 'auto' }}
      >
        <defs>
          {/* Gradient definitions for each agent */}
          {Object.entries(AGENT_META).map(([id, meta]) => (
            <radialGradient key={id} id={`nodeGrad-${id}`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor={meta.colorLight} stopOpacity="0.9" />
              <stop offset="100%" stopColor={meta.color} stopOpacity="0.7" />
            </radialGradient>
          ))}

          {/* Glow filter */}
          <filter id="nodeGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Particle glow */}
          <filter id="particleGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Connector lines */}
        {connectors.map((conn, i) => {
          const fromStatus = getNodeStatus(conn.from as AgentId);
          const toStatus = getNodeStatus(conn.to as AgentId);
          const isLit = fromStatus === 'completed';
          const isFlowing = fromStatus === 'completed' && toStatus === 'running';
          const meta = AGENT_META[conn.from as AgentId];

          return (
            <g key={`conn-${i}`}>
              {/* Background line */}
              <path
                d={conn.path}
                fill="none"
                stroke="rgba(48,57,74,0.4)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Lit line */}
              {isLit && (
                <motion.path
                  d={conn.path}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0.6 }}
                  animate={{ pathLength: 1, opacity: 0.8 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              )}
              {/* Flowing line */}
              {isFlowing && (
                <path
                  d={conn.path}
                  fill="none"
                  stroke={meta.colorLight}
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="pipeline-connector-flow"
                  style={{ stroke: meta.colorLight }}
                />
              )}
              {/* Data flow particles */}
              {isFlowing && (
                <>
                  <motion.circle
                    r="3"
                    fill={meta.colorLight}
                    filter="url(#particleGlow)"
                  >
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={conn.path}
                    />
                  </motion.circle>
                  <motion.circle
                    r="2"
                    fill={meta.colorLight}
                    filter="url(#particleGlow)"
                    opacity="0.6"
                  >
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      begin="1s"
                      path={conn.path}
                    />
                  </motion.circle>
                </>
              )}
            </g>
          );
        })}

        {/* Parallel indicator between Insight and Discovery */}
        <g>
          <line x1="232" y1="55" x2="232" y2="85" stroke="rgba(139,148,158,0.2)" strokeWidth="1" strokeDasharray="2 2" />
          <text x="232" y="73" textAnchor="middle" fill="rgba(139,148,158,0.35)" fontSize="9" fontFamily="monospace">
            PAR
          </text>
        </g>

        {/* Agent nodes */}
        {PIPELINE_FLOW.map((agentId) => {
          const pos = nodePositions[agentId];
          const meta = AGENT_META[agentId];
          const status = getNodeStatus(agentId);
          const stageInfo = stageMap[agentId];
          const isExpanded = expandedAgent === agentId;
          const Icon = meta.icon;

          return (
            <g
              key={agentId}
              className="cursor-pointer"
              onClick={() => onNodeClick(agentId)}
              role="button"
              aria-label={`${meta.label} agent - ${status}`}
            >
              {/* Outer glow for running nodes */}
              {status === 'running' && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius + 8}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth="1.5"
                  opacity="0.3"
                  className="pipeline-node-glow"
                  style={{ '--agent-color': `${meta.color}60` } as React.CSSProperties}
                />
              )}

              {/* Orbital ring for running nodes */}
              {status === 'running' && (
                <g className="pipeline-orbital-ring" style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}>
                  <circle
                    cx={pos.x + nodeRadius + 6}
                    cy={pos.y}
                    r="3"
                    fill={meta.colorLight}
                    opacity="0.8"
                  />
                </g>
              )}

              {/* Background circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeRadius}
                fill={status === 'skipped' ? 'rgba(22,27,34,0.5)' : `url(#nodeGrad-${agentId})`}
                opacity={status === 'pending' ? 0.3 : status === 'skipped' ? 0.2 : 1}
                stroke={status === 'running' ? meta.colorLight : status === 'completed' ? '#10b981' : status === 'failed' ? '#ef4444' : 'rgba(48,57,74,0.5)'}
                strokeWidth={status === 'running' ? 2.5 : 1.5}
                filter={status === 'running' ? 'url(#nodeGlowFilter)' : undefined}
              />

              {/* Completed shimmer overlay */}
              {status === 'completed' && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="0.5"
                  className="pipeline-completed-shimmer"
                  style={{ clipPath: 'circle(50%)' } as React.CSSProperties}
                />
              )}

              {/* Icon */}
              <foreignObject
                x={pos.x - 12}
                y={pos.y - 12}
                width={24}
                height={24}
                style={{ opacity: status === 'skipped' ? 0.2 : status === 'pending' ? 0.5 : 1 }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </foreignObject>

              {/* Status overlay icon */}
              {status === 'completed' && (
                <g>
                  <circle
                    cx={pos.x + nodeRadius - 4}
                    cy={pos.y - nodeRadius + 4}
                    r="9"
                    fill="#0d1117"
                    stroke="#10b981"
                    strokeWidth="1.5"
                  />
                  <path
                    d={`M${pos.x + nodeRadius - 8},${pos.y - nodeRadius + 4} L${pos.x + nodeRadius - 5},${pos.y - nodeRadius + 7} L${pos.x + nodeRadius},${pos.y - nodeRadius + 1}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pipeline-check-draw"
                  />
                </g>
              )}

              {status === 'failed' && (
                <g className="pipeline-shake" style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}>
                  <circle
                    cx={pos.x + nodeRadius - 4}
                    cy={pos.y - nodeRadius + 4}
                    r="9"
                    fill="#0d1117"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={pos.x + nodeRadius - 7}
                    y1={pos.y - nodeRadius + 1}
                    x2={pos.x + nodeRadius - 1}
                    y2={pos.y - nodeRadius + 7}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1={pos.x + nodeRadius - 1}
                    y1={pos.y - nodeRadius + 1}
                    x2={pos.x + nodeRadius - 7}
                    y2={pos.y - nodeRadius + 7}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {status === 'running' && (
                <circle
                  cx={pos.x + nodeRadius - 4}
                  cy={pos.y - nodeRadius + 4}
                  r="5"
                  fill={meta.color}
                  opacity="0.8"
                >
                  <animate
                    attributeName="r"
                    values="3;6;3"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.8;0.3;0.8"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {status === 'pending' && (
                <g opacity="0.4">
                  <circle
                    cx={pos.x + nodeRadius - 4}
                    cy={pos.y - nodeRadius + 4}
                    r="7"
                    fill="#0d1117"
                    stroke="#6b7280"
                    strokeWidth="1"
                  />
                  <Clock x={pos.x + nodeRadius - 8} y={pos.y - nodeRadius} width="8" height="8" stroke="#6b7280" strokeWidth="1.5" />
                </g>
              )}

              {/* Label */}
              <text
                x={pos.x}
                y={pos.y + nodeRadius + 16}
                textAnchor="middle"
                fill={status === 'pending' ? '#6b7280' : status === 'running' ? meta.colorLight : '#e6edf3'}
                fontSize="11"
                fontFamily="var(--font-plus-jakarta)"
                fontWeight="600"
                opacity={status === 'skipped' ? 0.3 : 0.9}
              >
                {meta.label}
              </text>

              {/* Duration under label */}
              {stageInfo?.durationMs != null && status === 'completed' && (
                <text
                  x={pos.x}
                  y={pos.y + nodeRadius + 28}
                  textAnchor="middle"
                  fill="#8b949e"
                  fontSize="9"
                  fontFamily="monospace"
                  opacity="0.7"
                >
                  {stageInfo.durationMs < 1000 ? `${stageInfo.durationMs}ms` : `${(stageInfo.durationMs / 1000).toFixed(1)}s`}
                </text>
              )}

              {/* Running status text */}
              {status === 'running' && (
                <text
                  x={pos.x}
                  y={pos.y + nodeRadius + 28}
                  textAnchor="middle"
                  fill={meta.colorLight}
                  fontSize="9"
                  fontFamily="monospace"
                  opacity="0.8"
                >
                  Processing...
                </text>
              )}

              {/* Expanded highlight ring */}
              {isExpanded && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius + 4}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.5"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Agent Detail Expansion ─────────────────────────────────────────────────

function AgentDetailPanel({
  agentId,
  stageInfo,
  onRetry,
  retrying,
}: {
  agentId: AgentId;
  stageInfo: StageInfo;
  onRetry: (agent: AgentId) => void;
  retrying: AgentId | null;
}) {
  const meta = AGENT_META[agentId];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="mt-2 rounded-xl bg-navy-800/60 border border-white/[0.06] p-4 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          {/* Agent icon with gradient */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${meta.color}30, ${meta.colorLight}15)`,
              border: `1px solid ${meta.color}30`,
            }}
          >
            <Icon className="w-6 h-6" style={{ color: meta.color }} />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{meta.label}</span>
              <span className="text-xs text-white/40 font-mono">{meta.role}</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">{meta.description}</p>

            {/* Duration breakdown */}
            {stageInfo.durationMs != null && (
              <div className="flex items-center gap-1.5">
                <Timer className="w-3 h-3 text-white/30" />
                <span className="text-xs font-mono text-white/50">
                  Duration: {stageInfo.durationMs < 1000 ? `${stageInfo.durationMs}ms` : `${(stageInfo.durationMs / 1000).toFixed(1)}s`}
                </span>
              </div>
            )}

            {/* Error message */}
            {stageInfo.error && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-red-300/90">{stageInfo.error}</span>
              </div>
            )}

            {/* Output preview */}
            {stageInfo.result && (
              <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider">Output Preview</span>
                <p className="text-xs text-white/50 mt-1 font-mono leading-relaxed line-clamp-2">
                  {stageInfo.result.slice(0, 100)}{stageInfo.result.length > 100 ? '...' : ''}
                </p>
              </div>
            )}

            {/* Retry button for failed agents */}
            {stageInfo.status === 'failed' && (
              <button
                onClick={(e) => { e.stopPropagation(); onRetry(agentId); }}
                disabled={retrying === agentId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 mt-1"
                style={{
                  background: `${meta.color}20`,
                  color: meta.color,
                  border: `1px solid ${meta.color}30`,
                }}
              >
                {retrying === agentId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Retry Agent
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Premium Progress Bar ───────────────────────────────────────────────────

function PremiumProgressBar({ stages, totalActive }: { stages: StageInfo[]; totalActive: number }) {
  const completedCount = stages.filter(s => s.status === 'completed').length;
  const progress = totalActive > 0 ? (completedCount / totalActive) * 100 : 0;

  // Color stops for the gradient
  const colorStops = PIPELINE_FLOW.map(id => AGENT_META[id].color);

  return (
    <div className="relative w-full">
      {/* Track */}
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden relative">
        {/* Animated fill */}
        <motion.div
          className="h-full rounded-full relative pipeline-progress-shimmer"
          style={{
            '--bar-color-from': colorStops[0],
            '--bar-color-to': colorStops[2],
          } as React.CSSProperties}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        {/* Subtle inner shadow */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] pointer-events-none" />
      </div>

      {/* Stage markers */}
      <div className="relative h-4 mt-1">
        {PIPELINE_FLOW.map((agentId, i) => {
          const meta = AGENT_META[agentId];
          const stage = stages.find(s => s.agent === agentId);
          const pct = (i / (PIPELINE_FLOW.length - 1)) * 100;
          const isComplete = stage?.status === 'completed';

          return (
            <div
              key={agentId}
              className="absolute -translate-x-1/2"
              style={{ left: `${pct}%` }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: isComplete ? meta.color : 'rgba(48,57,74,0.5)',
                  boxShadow: isComplete ? `0 0 6px ${meta.color}60` : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PipelineStatus({ assessmentId, autoPoll = true, pollInterval = 3000, className = '' }: PipelineStatusProps) {
  const [pipelineRun, setPipelineRun] = useState<PipelineRunInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [retrying, setRetrying] = useState<AgentId | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<AgentId | null>(null);
  const [displayedDuration, setDisplayedDuration] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/pipeline?assessmentId=${assessmentId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'none') {
          setPipelineRun(null);
        } else {
          setPipelineRun(data as PipelineRunInfo);
        }
        setError(null);
      } else {
        setError('Failed to fetch pipeline status');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  // Auto-poll while running
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!autoPoll) return;
    if (!pipelineRun || (pipelineRun.status !== 'running' && pipelineRun.status !== 'pending')) return;

    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [autoPoll, pipelineRun?.status, pollInterval, fetchStatus]);

  // Typewriter effect for total duration
  useEffect(() => {
    if (!pipelineRun?.totalDurationMs || pipelineRun.status === 'running' || pipelineRun.status === 'pending') {
      setDisplayedDuration('');
      return;
    }
    const dur = pipelineRun.totalDurationMs;
    const text = dur < 1000 ? `${dur}ms` : `${(dur / 1000).toFixed(1)}s`;
    let i = 0;
    setDisplayedDuration('');
    const timer = setInterval(() => {
      i++;
      setDisplayedDuration(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, 60);
    return () => clearInterval(timer);
  }, [pipelineRun?.totalDurationMs, pipelineRun?.status]);

  const handleRetry = async (agent: AgentId) => {
    if (!pipelineRun) return;
    setRetrying(agent);
    try {
      const res = await fetch(`/api/pipeline/${pipelineRun.id}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent }),
      });
      if (res.ok) {
        await fetchStatus();
      }
    } catch {
      // Ignore
    } finally {
      setRetrying(null);
    }
  };

  const handleTriggerPipeline = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPipelineRun(data as PipelineRunInfo);
      }
    } catch {
      setError('Failed to trigger pipeline');
    } finally {
      setLoading(false);
    }
  };

  // Format duration
  const formatDuration = (ms: number | null): string => {
    if (!ms) return '--';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // ── No pipeline run yet ──
  if (!loading && !pipelineRun) {
    return (
      <div className={`aurora-card rounded-2xl p-[1px] ${className}`}>
        <div className="bg-navy-800/80 backdrop-blur-sm rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/15 border border-blue-500/20">
              <Brain className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white font-heading">AI Agent Pipeline</h3>
              <p className="text-xs text-white/40">Orchestrate all six AI agents</p>
            </div>
          </div>
          <p className="text-sm text-white/50 mb-4 leading-relaxed">
            The orchestrator hasn&apos;t been triggered yet. Run the pipeline to execute all AI agents automatically in sequence.
          </p>
          <button
            onClick={handleTriggerPipeline}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
              boxShadow: '0 4px 20px rgba(37, 99, 235, 0.3)',
            }}
          >
            <Zap className="w-4 h-4" />
            Run Pipeline
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className={`aurora-card rounded-2xl p-[1px] ${className}`}>
        <div className="bg-navy-800/80 backdrop-blur-sm rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/15">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            </div>
            <span className="text-white/50 text-sm">Loading pipeline status...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Pipeline status display ──
  const stages = pipelineRun?.stages ?? [];
  const completedCount = stages.filter(s => s.status === 'completed').length;
  const totalActive = stages.filter(s => s.status !== 'skipped').length;
  const isRunning = pipelineRun?.status === 'running' || pipelineRun?.status === 'pending';
  const isFailed = pipelineRun?.status === 'failed';
  const isPartial = pipelineRun?.status === 'partial';
  const isComplete = pipelineRun?.status === 'completed';

  const statusConfig = {
    complete: { color: '#10b981', bgColor: 'rgba(16,185,129,0.15)', label: 'Pipeline Complete', icon: CheckCircle2 },
    running: { color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', label: 'Pipeline Running', icon: Activity },
    partial: { color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', label: 'Partially Complete', icon: AlertTriangle },
    failed: { color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)', label: 'Pipeline Failed', icon: XCircle },
  };

  const currentStatus = isComplete ? 'complete' : isRunning ? 'running' : isPartial ? 'partial' : 'failed';
  const statusCfg = statusConfig[currentStatus];
  const StatusIcon = statusCfg.icon;

  const handleNodeClick = (agent: AgentId) => {
    setExpandedAgent(prev => prev === agent ? null : agent);
  };

  return (
    <div className={`aurora-card rounded-2xl p-[1px] overflow-hidden ${className}`}>
      <div className="bg-navy-800/80 backdrop-blur-sm rounded-2xl">
        {/* ─── Premium Header ─── */}
        <div
          className="p-5 cursor-pointer hover:bg-white/[0.015] transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Pipeline icon with gradient */}
              <div className="relative">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${statusCfg.color}25, ${statusCfg.color}10)`,
                    border: `1px solid ${statusCfg.color}30`,
                  }}
                >
                  {isRunning ? (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: statusCfg.color }} />
                  ) : (
                    <StatusIcon className="w-5 h-5" style={{ color: statusCfg.color }} />
                  )}
                </div>
                {/* Animated ring for running */}
                {isRunning && (
                  <div
                    className="absolute -inset-1 rounded-xl"
                    style={{
                      border: `1px solid ${statusCfg.color}20`,
                      animation: 'nodeGlow 2s ease-in-out infinite',
                      '--agent-color': `${statusCfg.color}30`,
                    } as React.CSSProperties}
                  />
                )}
              </div>

              <div>
                <h3 className="text-base font-semibold text-white font-heading tracking-tight">AI Agent Pipeline</h3>
                <div className="flex items-center gap-2.5 mt-0.5">
                  {/* Status badge with gradient */}
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      background: statusCfg.bgColor,
                      color: statusCfg.color,
                      border: `1px solid ${statusCfg.color}25`,
                    }}
                  >
                    {statusCfg.label}
                  </span>

                  {/* Agent count */}
                  <span className="inline-flex items-center gap-1 text-xs text-white/40">
                    <Layers className="w-3 h-3" />
                    <motion.span
                      key={completedCount}
                      initial={{ scale: 1.3, color: '#10b981' }}
                      animate={{ scale: 1, color: 'rgba(255,255,255,0.4)' }}
                      transition={{ duration: 0.4 }}
                    >
                      {completedCount}
                    </motion.span>
                    /{totalActive} agents
                  </span>

                  {/* Total duration with typewriter */}
                  {displayedDuration && (
                    <span className="inline-flex items-center gap-1 text-xs text-white/40">
                      <Timer className="w-3 h-3" />
                      <span className="font-mono pipeline-typewriter">{displayedDuration}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Mini progress bar */}
              <div className="hidden sm:block w-28 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full pipeline-progress-shimmer"
                  style={{
                    '--bar-color-from': '#3b82f6',
                    '--bar-color-to': '#10b981',
                  } as React.CSSProperties}
                  initial={{ width: 0 }}
                  animate={{ width: totalActive > 0 ? `${(completedCount / totalActive) * 100}%` : '0%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* Expand/collapse */}
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronUp className="w-4 h-4 text-white/30" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* ─── Expanded Content ─── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-4">
                {/* Separator */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

                {/* SVG Pipeline Flow Diagram */}
                <PipelineFlowDiagram
                  stages={stages}
                  expandedAgent={expandedAgent}
                  onNodeClick={handleNodeClick}
                  onRetry={handleRetry}
                  retrying={retrying}
                />

                {/* Premium Progress Bar */}
                <PremiumProgressBar stages={stages} totalActive={totalActive} />

                {/* Agent Detail Expansion */}
                <AnimatePresence mode="wait">
                  {expandedAgent && stages.find(s => s.agent === expandedAgent) && (
                    <AgentDetailPanel
                      agentId={expandedAgent}
                      stageInfo={stages.find(s => s.agent === expandedAgent)!}
                      onRetry={handleRetry}
                      retrying={retrying}
                    />
                  )}
                </AnimatePresence>

                {/* Agent List with status (compact) */}
                <div className="space-y-1">
                  {stages.map((stage) => {
                    const agentId = stage.agent as AgentId;
                    const meta = AGENT_META[agentId];
                    const Icon = meta.icon;
                    const isAgentExpanded = expandedAgent === agentId;

                    return (
                      <motion.button
                        key={stage.agent}
                        onClick={() => handleNodeClick(agentId)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 hover:bg-white/[0.03] group text-left"
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.995 }}
                      >
                        {/* Agent mini icon */}
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                          style={{
                            background: `${meta.color}15`,
                            border: `1px solid ${meta.color}20`,
                          }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                        </div>

                        {/* Agent name + description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-white/80">{meta.label}</span>
                            {stage.status === 'running' && (
                              <span className="text-[10px] font-mono animate-pulse" style={{ color: meta.color }}>
                                Processing...
                              </span>
                            )}
                          </div>
                          {stage.error && (
                            <p className="text-[10px] text-red-400/80 truncate">{stage.error}</p>
                          )}
                        </div>

                        {/* Duration */}
                        {stage.durationMs != null && (
                          <span className="text-[10px] font-mono text-white/30 flex-shrink-0">
                            {formatDuration(stage.durationMs)}
                          </span>
                        )}

                        {/* Status indicator */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {stage.status === 'completed' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          {stage.status === 'running' && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: meta.color }} />
                          )}
                          {stage.status === 'failed' && (
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                          )}
                          {stage.status === 'pending' && (
                            <Clock className="w-3.5 h-3.5 text-white/20" />
                          )}
                          {stage.status === 'skipped' && (
                            <SkipForward className="w-3.5 h-3.5 text-white/15" />
                          )}

                          {/* Retry for failed */}
                          {stage.status === 'failed' && (
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRetry(agentId); }}
                                disabled={retrying === agentId}
                                className="p-1 rounded-md hover:bg-white/10 transition-colors"
                              >
                                {retrying === agentId ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                                ) : (
                                  <RefreshCw className="w-3 h-3 text-white/30 hover:text-white/70" />
                                )}
                              </button>
                            </motion.div>
                          )}
                        </div>

                        {/* Expand indicator */}
                        <CircleDot
                          className="w-3 h-3 text-white/10 group-hover:text-white/25 transition-colors flex-shrink-0"
                          style={{ color: isAgentExpanded ? meta.color : undefined, opacity: isAgentExpanded ? 0.6 : undefined }}
                        />
                      </motion.button>
                    );
                  })}
                </div>

                {/* Flow legend */}
                <div className="flex items-center justify-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[9px] text-white/25 font-mono uppercase tracking-wider">Sequential</span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 -ml-0.5" />
                    <span className="text-[9px] text-white/25 font-mono uppercase tracking-wider">Parallel</span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <span className="text-[9px] text-white/25 font-mono">Scoring / Insight / Discovery / Report / Literacy</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
