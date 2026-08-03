import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  DollarSign,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useActivities,
  useBuzzerAlerts,
  useEscalations,
  useFollowups,
  useLeads,
} from "@/lib/leads/hooks";
import type { Lead } from "@/lib/leads/types";
import { LEAD_STATUSES, STAGES } from "@/lib/leads/types";
import { formatCurrency, percent, relativeTime } from "@/lib/leads/format";
import { EmptyState, Panel, PanelSkeleton, SectionHeader, StatTile } from "./common/Primitives";
import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";

const STAGE_COLORS: Record<string, string> = {
  new: "oklch(0.72 0.14 235)",
  contacted: "oklch(0.66 0.17 274)",
  demo: "oklch(0.7 0.16 200)",
  negotiation: "oklch(0.79 0.15 74)",
  won: "oklch(0.72 0.17 155)",
  lost: "oklch(0.63 0.19 20)",
};

export function LeadDashboard({ onOpenLead }: { onOpenLead: (lead: Lead) => void }) {
  const { data: leads = [], isLoading } = useLeads();
  const { data: activities = [] } = useActivities();
  const { data: followups = [] } = useFollowups();
  const { data: escalations = [] } = useEscalations();
  const { data: alerts = [] } = useBuzzerAlerts();

  const stats = useMemo(() => {
    const total = leads.length;
    const won = leads.filter((l) => l.status === "won");
    const lost = leads.filter((l) => l.status === "lost").length;
    const open = leads.filter((l) => l.status !== "won" && l.status !== "lost");
    const pipelineValue = open.reduce((s, l) => s + Number(l.expected_value), 0);
    const revenue = won.reduce((s, l) => s + Number(l.expected_value), 0);
    const avgScore = total ? Math.round(leads.reduce((s, l) => s + l.ai_score, 0) / total) : 0;
    return {
      total,
      open: open.length,
      hot: leads.filter((l) => l.priority === "hot").length,
      won: won.length,
      lost,
      pipelineValue,
      revenue,
      avgScore,
      conversion: percent(won.length, total),
      qualified: leads.filter((l) => l.qualified).length,
      unassigned: leads.filter((l) => !l.assigned_to).length,
      dueFollowups: followups.filter(
        (f) => f.status === "pending" && new Date(f.scheduled_at).getTime() < Date.now(),
      ).length,
      openEscalations: escalations.filter((e) => e.status !== "resolved").length,
      liveAlerts: alerts.filter((a) => !a.acknowledged).length,
    };
  }, [leads, followups, escalations, alerts]);

  const stageData = LEAD_STATUSES.map((s) => ({
    name: STAGES[s].short,
    value: leads.filter((l) => l.status === s).length,
    key: s,
  }));

  const trend = useMemo(() => {
    const days: { day: string; leads: number; won: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const inDay = leads.filter((l) => {
        const t = new Date(l.created_at).getTime();
        return t >= d.getTime() && t < next.getTime();
      });
      days.push({
        day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        leads: inDay.length,
        won: inDay.filter((l) => l.status === "won").length,
      });
    }
    return days;
  }, [leads]);

  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l) => map.set(l.source, (map.get(l.source) ?? 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [leads]);

  const priorityLeads = leads
    .filter((l) => l.status !== "won" && l.status !== "lost")
    .sort((a, b) => b.ai_score - a.ai_score)
    .slice(0, 6);

  if (isLoading) return <PanelSkeleton rows={6} />;

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Command Centre"
        title="Lead Manager Dashboard"
        description="Real-time state of every lead, owner and automation in Software Vala."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total leads" value={stats.total} hint={`${stats.open} open · ${stats.qualified} qualified`} icon={<Users className="h-4 w-4" />} />
        <StatTile label="Pipeline value" value={formatCurrency(stats.pipelineValue)} hint={`${formatCurrency(stats.revenue)} won`} tone="primary" icon={<DollarSign className="h-4 w-4" />} />
        <StatTile label="Conversion rate" value={`${stats.conversion}%`} hint={`${stats.won} won · ${stats.lost} lost`} tone="success" icon={<TrendingUp className="h-4 w-4" />} />
        <StatTile label="Avg AI score" value={stats.avgScore} hint={`${stats.hot} hot leads`} tone="info" icon={<Target className="h-4 w-4" />} />
        <StatTile label="Unassigned" value={stats.unassigned} hint="Waiting on routing" tone="warning" icon={<Users className="h-4 w-4" />} />
        <StatTile label="Follow-ups due" value={stats.dueFollowups} hint="Past scheduled time" tone="warning" icon={<Activity className="h-4 w-4" />} />
        <StatTile label="Open escalations" value={stats.openEscalations} hint="Awaiting resolution" tone="danger" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatTile label="Live buzzer alerts" value={stats.liveAlerts} hint="Unacknowledged" tone="danger" icon={<BellRing className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Lead flow — last 14 days" description="Captured vs won" className="xl:col-span-2" bodyClassName="h-72 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="leadFlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="leads" stroke="var(--primary)" fill="url(#leadFlow)" strokeWidth={2} />
              <Area type="monotone" dataKey="won" stroke="var(--success)" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Stage distribution" bodyClassName="h-72 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={stageData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {stageData.map((d) => (
                  <Cell key={d.key} fill={STAGE_COLORS[d.key] ?? "var(--primary)"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Leads by source" bodyClassName="h-64 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bySource} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={10} width={110} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="value" fill="var(--accent)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Live activity feed" description="Latest actions across the module" bodyClassName="max-h-64 space-y-3 overflow-y-auto">
          {activities.length === 0 ? <EmptyState title="No activity yet" /> : null}
          {activities.slice(0, 20).map((a) => (
            <div key={a.id} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{a.action}</p>
                <p className="truncate text-[11px] text-muted-foreground">{a.detail}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {a.actor} · {relativeTime(a.created_at)}
                </p>
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="Stage health" description="Value locked per stage" bodyClassName="space-y-3">
          {LEAD_STATUSES.map((s) => {
            const rows = leads.filter((l) => l.status === s);
            const value = rows.reduce((sum, l) => sum + Number(l.expected_value), 0);
            return (
              <div key={s}>
                <div className="flex items-center justify-between text-xs">
                  <span className={cn("font-semibold", STAGES[s].textClass)}>{STAGES[s].label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {rows.length} · {formatCurrency(value)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className={cn("h-full", STAGES[s].gradientClass)} style={{ width: `${percent(rows.length, leads.length)}%` }} />
                </div>
              </div>
            );
          })}
        </Panel>
      </div>

      <Panel title="Priority leads" description="Highest AI score in the open pipeline" bodyClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {priorityLeads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onOpen={onOpenLead} compact />
        ))}
      </Panel>
    </div>
  );
}
