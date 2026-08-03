import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Brain,
  CheckCircle2,
  Globe,
  Plus,
  ScrollText,
  ShieldCheck,
  Timer,
  UserPlus,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useAlertMutations,
  useAuditLogs,
  useBehaviorEvents,
  useBuzzerAlerts,
  useComplianceMutations,
  useConsents,
  useEscalationMutations,
  useEscalations,
  useFollowupMutations,
  useFollowupRules,
  useFollowups,
  useLeadMutations,
  useLeads,
  usePolicies,
  useQualificationRules,
  useRuleMutations,
  useScoringFactors,
  useSources,
  useTeam,
  useTerritories,
} from "@/lib/leads/hooks";
import type { Lead } from "@/lib/leads/types";
import { LEAD_STATUSES, STAGES } from "@/lib/leads/types";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  percent,
  relativeTime,
  scoreTone,
  severityTone,
} from "@/lib/leads/format";
import { EmptyState, Panel, PanelSkeleton, SectionHeader, StatTile } from "./common/Primitives";
import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";

const control =
  "focus-ring h-9 w-full rounded-lg border border-border bg-secondary/60 px-3 text-xs text-foreground";

/* ----------------------------- incoming ---------------------------------- */

export function LeadIncoming({ search, onOpenLead }: { search: string; onOpenLead: (l: Lead) => void }) {
  const { data: leads = [], isLoading } = useLeads({ status: "new", search });
  const { data: sources = [] } = useSources();
  const { changeStatus } = useLeadMutations();

  if (isLoading) return <PanelSkeleton rows={4} />;

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Capture" title="Incoming Leads" description="Newly captured leads awaiting first response." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="New today" value={leads.filter((l) => Date.now() - new Date(l.created_at).getTime() < 864e5).length} icon={<BellRing className="h-4 w-4" />} />
        <StatTile label="Awaiting contact" value={leads.length} tone="warning" />
        <StatTile label="Hot arrivals" value={leads.filter((l) => l.priority === "hot").length} tone="danger" />
        <StatTile label="Value in queue" value={formatCurrency(leads.reduce((s, l) => s + Number(l.expected_value), 0))} tone="primary" />
      </div>

      <Panel title="Connected capture channels" description="Live sources writing into the lead table" bodyClassName="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sources.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{s.name}</p>
              <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", s.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                {s.active ? "Active" : "Paused"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {s.channel} · {formatCurrency(s.cost_per_lead)} per lead
            </p>
            <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{s.webhook_url ?? "No webhook configured"}</p>
          </div>
        ))}
      </Panel>

      {leads.length === 0 ? (
        <EmptyState title="No new leads" description="Every incoming lead has been picked up." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {leads.map((lead) => (
            <div key={lead.id} className="space-y-2">
              <LeadCard lead={lead} onOpen={onOpenLead} />
              <button
                onClick={() => changeStatus.mutate({ id: lead.id, status: "contacted" })}
                className="w-full rounded-lg border border-primary/45 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"
              >
                Accept & mark contacted
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- assignment --------------------------------- */

export function LeadAssignment({ onOpenLead }: { onOpenLead: (l: Lead) => void }) {
  const { data: leads = [] } = useLeads();
  const { data: team = [] } = useTeam();
  const { assign } = useLeadMutations();
  const unassigned = leads.filter((l) => !l.assigned_to && l.status !== "won" && l.status !== "lost");

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Routing" title="Lead Assignment" description="Balance workload across regional owners." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Unassigned" value={unassigned.length} tone="warning" icon={<UserPlus className="h-4 w-4" />} />
        <StatTile label="Active reps" value={team.filter((t) => t.active).length} />
        <StatTile label="Total capacity" value={team.reduce((s, t) => s + t.capacity, 0)} tone="info" />
        <StatTile label="Assigned leads" value={leads.filter((l) => l.assigned_to).length} tone="success" />
      </div>

      <Panel title="Team workload" bodyClassName="space-y-3">
        {team.map((m) => {
          const load = leads.filter((l) => l.assigned_to === m.vala_id && l.status !== "won" && l.status !== "lost").length;
          return (
            <div key={m.id} className="rounded-xl border border-border bg-secondary/30 p-3">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-foreground">{m.full_name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {m.vala_id} · {m.role} · {m.region}
                  </p>
                </div>
                <span className="tabular-nums text-xs text-muted-foreground">
                  {load}/{m.capacity}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full rounded-full", load > m.capacity ? "bg-destructive" : "gradient-command")}
                  style={{ width: `${Math.min(100, percent(load, m.capacity))}%` }}
                />
              </div>
            </div>
          );
        })}
      </Panel>

      <Panel title="Awaiting routing" bodyClassName="space-y-3">
        {unassigned.length === 0 ? <EmptyState title="Everything is routed" /> : null}
        {unassigned.map((lead) => (
          <div key={lead.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3">
            <button onClick={() => onOpenLead(lead)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-foreground">{lead.full_name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {lead.region} · {lead.software_interest} · {formatCurrency(lead.expected_value)}
              </p>
            </button>
            <select
              className={cn(control, "max-w-64")}
              defaultValue=""
              onChange={(e) => {
                const member = team.find((t) => t.vala_id === e.target.value);
                if (member) assign.mutate({ id: lead.id, to: member.vala_id, role: member.role });
              }}
            >
              <option value="">Assign owner…</option>
              {team.filter((t) => t.active).map((t) => (
                <option key={t.id} value={t.vala_id}>
                  {t.full_name} ({t.region})
                </option>
              ))}
            </select>
          </div>
        ))}
      </Panel>
    </div>
  );
}

/* --------------------------- qualification -------------------------------- */

export function LeadQualification() {
  const { data: rules = [] } = useQualificationRules();
  const { data: leads = [] } = useLeads();
  const { toggleQualification, createQualification } = useRuleMutations();
  const [form, setForm] = useState({ name: "", criteria: "", weight: "10", auto_action: "" });

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Intelligence" title="AI Qualification Engine" description="Rules that decide when a lead becomes sales-ready." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Qualified leads" value={leads.filter((l) => l.qualified).length} tone="success" icon={<Brain className="h-4 w-4" />} />
        <StatTile label="Active rules" value={rules.filter((r) => r.active).length} tone="primary" />
        <StatTile label="Total matches" value={rules.reduce((s, r) => s + r.matched_count, 0)} tone="info" />
        <StatTile label="Prime interest flags" value={leads.filter((l) => l.ai_score >= 85).length} tone="warning" />
      </div>

      <Panel title="Qualification rules" bodyClassName="space-y-3">
        {rules.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{r.name}</p>
              <p className="text-[11px] text-muted-foreground">{r.criteria}</p>
              <p className="mt-0.5 font-mono text-[10px] text-accent">Auto action: {r.auto_action}</p>
            </div>
            <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              weight {r.weight}
            </span>
            <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              {r.matched_count} matches
            </span>
            <button
              onClick={() => toggleQualification.mutate({ id: r.id, active: !r.active })}
              className={cn("rounded-lg px-3 py-1.5 text-[11px] font-semibold", r.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}
            >
              {r.active ? "Active" : "Paused"}
            </button>
          </div>
        ))}
      </Panel>

      <Panel title="Create rule" bodyClassName="grid gap-3 sm:grid-cols-4">
        <input className={control} placeholder="Rule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={control} placeholder="Criteria" value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} />
        <input className={control} type="number" placeholder="Weight" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
        <div className="flex gap-2">
          <input className={control} placeholder="Auto action" value={form.auto_action} onChange={(e) => setForm({ ...form, auto_action: e.target.value })} />
          <button
            disabled={!form.name || !form.criteria}
            onClick={() =>
              createQualification.mutate(
                { name: form.name, criteria: form.criteria, weight: Number(form.weight) || 0, auto_action: form.auto_action },
                { onSuccess: () => setForm({ name: "", criteria: "", weight: "10", auto_action: "" }) },
              )
            }
            className="rounded-lg gradient-command px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------ scoring ----------------------------------- */

export function LeadScoring({ onOpenLead }: { onOpenLead: (l: Lead) => void }) {
  const { data: factors = [] } = useScoringFactors();
  const { data: leads = [] } = useLeads();
  const { updateFactor } = useRuleMutations();

  const buckets = [
    { label: "90-100", min: 90 },
    { label: "75-89", min: 75 },
    { label: "60-74", min: 60 },
    { label: "40-59", min: 40 },
    { label: "0-39", min: 0 },
  ].map((b, i, arr) => ({
    name: b.label,
    leads: leads.filter((l) => l.ai_score >= b.min && (i === 0 || l.ai_score < (arr[i - 1]?.min ?? 101))).length,
  }));

  const top = [...leads].sort((a, b) => b.conversion_probability - a.conversion_probability).slice(0, 6);

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Intelligence" title="Lead Scoring & Prediction" description="Weighted factors driving AI score and conversion probability." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Avg AI score" value={leads.length ? Math.round(leads.reduce((s, l) => s + l.ai_score, 0) / leads.length) : 0} tone="primary" />
        <StatTile label="Avg conversion" value={`${leads.length ? Math.round(leads.reduce((s, l) => s + l.conversion_probability, 0) / leads.length) : 0}%`} tone="success" />
        <StatTile label="High-quality leads" value={leads.filter((l) => l.quality_score >= 80).length} tone="info" />
        <StatTile label="Risk detection rate" value={`${percent(leads.filter((l) => l.urgency_score >= 80).length, leads.length)}%`} tone="warning" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Score distribution" bodyClassName="h-64 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="leads" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Scoring factors" description="Adjust weights used by the engine" bodyClassName="space-y-4">
          {factors.map((f) => (
            <div key={f.id}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{f.name}</span>
                <span className="tabular-nums text-muted-foreground">{f.weight}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{f.category} · {f.description}</p>
              <input
                type="range"
                min={0}
                max={100}
                defaultValue={f.weight}
                onMouseUp={(e) => updateFactor.mutate({ id: f.id, weight: Number((e.target as HTMLInputElement).value) })}
                onTouchEnd={(e) => updateFactor.mutate({ id: f.id, weight: Number((e.target as HTMLInputElement).value) })}
                className="mt-1 w-full accent-[var(--primary)]"
              />
            </div>
          ))}
        </Panel>
      </div>

      <Panel title="Highest predicted conversions" bodyClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {top.map((l) => (
          <LeadCard key={l.id} lead={l} onOpen={onOpenLead} compact />
        ))}
      </Panel>
    </div>
  );
}

/* ------------------------------- buzzer ----------------------------------- */

export function LeadBuzzer() {
  const { data: alerts = [] } = useBuzzerAlerts();
  const { acknowledge } = useAlertMutations();
  const live = alerts.filter((a) => !a.acknowledged);

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Execution" title="Buzzer Alerts" description="Instant alerts for hot leads and SLA breaches." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Live alerts" value={live.length} tone="danger" icon={<BellRing className="h-4 w-4" />} />
        <StatTile label="Critical" value={live.filter((a) => a.severity === "critical").length} tone="danger" />
        <StatTile label="Acknowledged" value={alerts.length - live.length} tone="success" />
        <StatTile label="Total raised" value={alerts.length} />
      </div>

      <Panel title="Alert stream" bodyClassName="space-y-3">
        {alerts.length === 0 ? <EmptyState title="No alerts" description="The buzzer is quiet." /> : null}
        {alerts.map((a) => (
          <div
            key={a.id}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3",
              severityTone(a.severity),
              !a.acknowledged && a.severity === "critical" && "pulse-alert",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{a.title}</p>
              <p className="text-[11px] text-muted-foreground">{a.message}</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {a.severity} · {relativeTime(a.created_at)}
                {a.acknowledged_by ? ` · ack by ${a.acknowledged_by}` : ""}
              </p>
            </div>
            {a.acknowledged ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledged
              </span>
            ) : (
              <button onClick={() => acknowledge.mutate(a.id)} className="rounded-lg gradient-command px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">
                Acknowledge
              </button>
            )}
          </div>
        ))}
      </Panel>
    </div>
  );
}

/* ------------------------------ territory --------------------------------- */

export function LeadTerritory() {
  const { data: territories = [] } = useTerritories();
  const { data: leads = [] } = useLeads();
  const { data: team = [] } = useTeam();

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Routing" title="Territory & Region Map" description="Coverage, targets and owners per territory." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Territories" value={territories.length} icon={<Globe className="h-4 w-4" />} />
        <StatTile label="Continents" value={new Set(territories.map((t) => t.continent)).size} tone="info" />
        <StatTile label="Total target" value={territories.reduce((s, t) => s + t.target_leads, 0)} tone="primary" />
        <StatTile label="Coverage" value={`${percent(leads.length, territories.reduce((s, t) => s + t.target_leads, 0))}%`} tone="success" />
      </div>

      <Panel title="Territory performance" bodyClassName="space-y-3">
        {territories.map((t) => {
          const rows = leads.filter((l) => l.region === t.country);
          const manager = team.find((m) => m.vala_id === t.manager_vala_id);
          return (
            <div key={t.id} className="rounded-xl border border-border bg-secondary/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {t.continent} · {t.latitude.toFixed(2)}, {t.longitude.toFixed(2)} · {manager?.full_name ?? "No manager"}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {rows.length}/{t.target_leads} leads · {formatCurrency(rows.reduce((s, l) => s + Number(l.expected_value), 0))}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full gradient-signal" style={{ width: `${Math.min(100, percent(rows.length, t.target_leads))}%` }} />
              </div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

/* ----------------------------- follow-ups --------------------------------- */

export function FollowUpAutomation({ onOpenLead }: { onOpenLead: (l: Lead) => void }) {
  const { data: followups = [] } = useFollowups();
  const { data: rules = [] } = useFollowupRules();
  const { data: leads = [] } = useLeads();
  const { update, remove, toggleRule } = useFollowupMutations();
  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const overdue = followups.filter((f) => f.status === "pending" && new Date(f.scheduled_at).getTime() < Date.now());

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Execution" title="Follow-up Automation" description="Scheduled touchpoints and the rules that generate them." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Scheduled" value={followups.filter((f) => f.status === "pending").length} icon={<Timer className="h-4 w-4" />} />
        <StatTile label="Overdue" value={overdue.length} tone="danger" />
        <StatTile label="Completed" value={followups.filter((f) => f.status === "completed").length} tone="success" />
        <StatTile label="Active automations" value={rules.filter((r) => r.active).length} tone="primary" />
      </div>

      <Panel title="Automation rules" bodyClassName="space-y-3">
        {rules.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{r.name}</p>
              <p className="text-[11px] text-muted-foreground">
                On <span className="text-accent">{r.trigger_event}</span> → {r.channel} after {r.delay_minutes} min
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{r.template}</p>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {r.triggered_count} sent · {r.success_count} converted
            </span>
            <button
              onClick={() => toggleRule.mutate({ id: r.id, active: !r.active })}
              className={cn("rounded-lg px-3 py-1.5 text-[11px] font-semibold", r.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}
            >
              {r.active ? "Active" : "Paused"}
            </button>
          </div>
        ))}
      </Panel>

      <Panel title="Scheduled follow-ups" bodyClassName="space-y-2">
        {followups.length === 0 ? <EmptyState title="Nothing scheduled" /> : null}
        {followups.map((f) => {
          const lead = leadById.get(f.lead_id);
          const late = f.status === "pending" && new Date(f.scheduled_at).getTime() < Date.now();
          return (
            <div key={f.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3", late ? "border-destructive/45 bg-destructive/10" : "border-border bg-secondary/30")}>
              <button onClick={() => lead && onOpenLead(lead)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-foreground">{f.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {lead?.full_name ?? "Lead"} · {f.channel} · {formatDateTime(f.scheduled_at)} · {f.assigned_to ?? "unassigned"}
                </p>
              </button>
              <span className="rounded-md border border-border px-2 py-0.5 text-[11px] capitalize text-muted-foreground">{f.status}</span>
              {f.status !== "completed" ? (
                <button onClick={() => update.mutate({ id: f.id, patch: { status: "completed" } })} className="rounded-lg border border-success/45 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                  Complete
                </button>
              ) : null}
              <button onClick={() => remove.mutate(f.id)} className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-destructive">
                Remove
              </button>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

/* ----------------------------- escalation --------------------------------- */

export function LeadEscalation({ onOpenLead }: { onOpenLead: (l: Lead) => void }) {
  const { data: escalations = [] } = useEscalations();
  const { data: leads = [] } = useLeads();
  const { update, resolve } = useEscalationMutations();
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const open = escalations.filter((e) => e.status !== "resolved");

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Execution" title="Escalation Management" description="SLA breaches and management interventions." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Open" value={open.length} tone="danger" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatTile label="Level 2+" value={open.filter((e) => e.level >= 2).length} tone="warning" />
        <StatTile label="Resolved" value={escalations.length - open.length} tone="success" />
        <StatTile label="Avg SLA (min)" value={escalations.length ? Math.round(escalations.reduce((s, e) => s + e.sla_minutes, 0) / escalations.length) : 0} tone="info" />
      </div>

      <Panel title="Escalation queue" bodyClassName="space-y-3">
        {escalations.length === 0 ? <EmptyState title="No escalations" /> : null}
        {escalations.map((e) => {
          const lead = e.lead_id ? leadById.get(e.lead_id) : undefined;
          return (
            <div key={e.id} className={cn("rounded-xl border p-4", e.status === "resolved" ? "border-border bg-secondary/30" : "border-destructive/45 bg-destructive/10")}>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => lead && onOpenLead(lead)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold text-foreground">{e.reason}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {lead?.full_name ?? "Lead"} · level {e.level} · SLA {e.sla_minutes}m · raised by {e.raised_by} {relativeTime(e.created_at)}
                  </p>
                </button>
                <span className="rounded-md border border-border px-2 py-0.5 text-[11px] capitalize text-muted-foreground">{e.status}</span>
                {e.status !== "resolved" ? (
                  <button onClick={() => update.mutate({ id: e.id, patch: { level: e.level + 1, status: "escalated" } })} className="rounded-lg border border-warning/45 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning">
                    Escalate further
                  </button>
                ) : null}
              </div>
              {e.status !== "resolved" ? (
                <div className="mt-3 flex gap-2">
                  <input
                    value={resolutions[e.id] ?? ""}
                    onChange={(ev) => setResolutions((p) => ({ ...p, [e.id]: ev.target.value }))}
                    placeholder="Resolution summary"
                    className={control}
                  />
                  <button
                    disabled={!(resolutions[e.id] ?? "").trim()}
                    onClick={() => resolve.mutate({ id: e.id, resolution: (resolutions[e.id] ?? "").trim() })}
                    className="shrink-0 rounded-lg gradient-command px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Resolve
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Resolved {relativeTime(e.resolved_at)} — {e.resolution}
                </p>
              )}
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

/* ----------------------------- compliance --------------------------------- */

export function LeadCompliance({ onOpenLead }: { onOpenLead: (l: Lead) => void }) {
  const { data: policies = [] } = usePolicies();
  const { data: consents = [] } = useConsents();
  const { data: leads = [] } = useLeads();
  const { review, setDoNotContact } = useComplianceMutations();
  const dnc = leads.filter((l) => l.do_not_contact);

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Governance" title="Compliance & Policy" description="Consent, data protection and contact governance." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Policies" value={policies.length} icon={<ShieldCheck className="h-4 w-4" />} />
        <StatTile label="Compliant" value={policies.filter((p) => p.status === "compliant").length} tone="success" />
        <StatTile label="Consent granted" value={leads.filter((l) => l.consent_given).length} tone="info" />
        <StatTile label="Do-not-contact" value={dnc.length} tone="danger" />
      </div>

      <Panel title="Policy register" bodyClassName="space-y-3">
        {policies.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{p.title}</p>
              <p className="text-[11px] text-muted-foreground">{p.description}</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {p.category} · last reviewed {formatDate(p.last_reviewed)}
              </p>
            </div>
            <select className={cn(control, "max-w-40")} value={p.status} onChange={(e) => review.mutate({ id: p.id, status: e.target.value })}>
              {["compliant", "review_due", "at_risk"].map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        ))}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Do-not-contact register" bodyClassName="space-y-2">
          {dnc.length === 0 ? <EmptyState title="No suppressed contacts" /> : null}
          {dnc.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2">
              <button onClick={() => onOpenLead(l)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm text-foreground">{l.full_name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{l.region} · {l.source}</p>
              </button>
              <button onClick={() => setDoNotContact.mutate({ leadId: l.id, value: false })} className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-foreground">
                Restore
              </button>
            </div>
          ))}
        </Panel>

        <Panel title="Consent ledger" bodyClassName="max-h-80 space-y-2 overflow-y-auto">
          {consents.length === 0 ? <EmptyState title="No consent records" /> : null}
          {consents.slice(0, 60).map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2">
              <div>
                <p className="text-xs text-foreground">{c.channel} · {c.captured_via}</p>
                <p className="text-[10px] text-muted-foreground">{formatDateTime(c.captured_at)}</p>
              </div>
              <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", c.granted ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                {c.granted ? "Granted" : "Withdrawn"}
              </span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------ behavior ---------------------------------- */

export function LeadBehavior({ onOpenLead }: { onOpenLead: (l: Lead) => void }) {
  const { data: events = [] } = useBehaviorEvents();
  const { data: leads = [] } = useLeads();
  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((e) => map.set(e.event_type, (map.get(e.event_type) ?? 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [events]);

  const totalTime = events.reduce((s, e) => s + e.duration_seconds, 0);

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Intelligence" title="Behaviour Tracking" description="Digital signals captured before and after contact." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Tracked events" value={events.length} />
        <StatTile label="Engaged leads" value={new Set(events.map((e) => e.lead_id)).size} tone="primary" />
        <StatTile label="Total dwell time" value={`${Math.round(totalTime / 60)}m`} tone="info" />
        <StatTile label="Mobile share" value={`${percent(events.filter((e) => e.device === "mobile").length, events.length)}%`} tone="warning" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Event mix" bodyClassName="h-64 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byType}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Recent behaviour" bodyClassName="max-h-64 space-y-2 overflow-y-auto">
          {events.slice(0, 40).map((e) => {
            const lead = leadById.get(e.lead_id);
            return (
              <button key={e.id} onClick={() => lead && onOpenLead(lead)} className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2 text-left">
                <div className="min-w-0">
                  <p className="truncate text-xs text-foreground">{lead?.full_name ?? "Lead"} — {e.event_type}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{e.page ?? "—"} · {e.device}</p>
                </div>
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {e.duration_seconds}s · {relativeTime(e.created_at)}
                </span>
              </button>
            );
          })}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------ analytics --------------------------------- */

export function LeadAnalytics() {
  const { data: leads = [] } = useLeads();
  const { data: team = [] } = useTeam();
  const { data: sources = [] } = useSources();

  const repPerformance = team.map((m) => {
    const owned = leads.filter((l) => l.assigned_to === m.vala_id);
    return {
      name: m.full_name.split(" ")[0] ?? m.vala_id,
      leads: owned.length,
      won: owned.filter((l) => l.status === "won").length,
    };
  });

  const sourceRoi = sources.map((s) => {
    const rows = leads.filter((l) => l.source === s.name);
    const won = rows.filter((l) => l.status === "won");
    return {
      name: s.name,
      leads: rows.length,
      revenue: won.reduce((sum, l) => sum + Number(l.expected_value), 0),
      cost: rows.length * Number(s.cost_per_lead),
      conversion: percent(won.length, rows.length),
    };
  });

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Governance" title="Analytics & Reports" description="Performance across owners, sources and stages." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total leads" value={leads.length} />
        <StatTile label="Won revenue" value={formatCurrency(leads.filter((l) => l.status === "won").reduce((s, l) => s + Number(l.expected_value), 0))} tone="success" />
        <StatTile label="Acquisition cost" value={formatCurrency(sourceRoi.reduce((s, r) => s + r.cost, 0))} tone="warning" />
        <StatTile label="Win rate" value={`${percent(leads.filter((l) => l.status === "won").length, leads.length)}%`} tone="primary" />
      </div>

      <Panel title="Rep performance" bodyClassName="h-72 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={repPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="leads" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="won" fill="var(--success)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Source ROI" bodyClassName="overflow-x-auto p-0">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              {["Source", "Leads", "Conversion", "Spend", "Revenue", "ROI"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sourceRoi.map((r) => (
              <tr key={r.name} className="border-b border-border/60">
                <td className="px-4 py-3 text-foreground">{r.name}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.leads}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.conversion}%</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatCurrency(r.cost)}</td>
                <td className="px-4 py-3 tabular-nums text-success">{formatCurrency(r.revenue)}</td>
                <td className={cn("px-4 py-3 tabular-nums", r.revenue >= r.cost ? "text-success" : "text-destructive")}>
                  {r.cost ? `${Math.round(((r.revenue - r.cost) / r.cost) * 100)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Stage conversion funnel" bodyClassName="space-y-3">
        {LEAD_STATUSES.map((s) => {
          const rows = leads.filter((l) => l.status === s);
          return (
            <div key={s}>
              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-semibold", STAGES[s].textClass)}>{STAGES[s].label}</span>
                <span className="tabular-nums text-muted-foreground">{rows.length} · {percent(rows.length, leads.length)}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                <div className={cn("h-full", STAGES[s].gradientClass)} style={{ width: `${percent(rows.length, leads.length)}%` }} />
              </div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

/* ------------------------------ audit trail -------------------------------- */

export function AuditTrail() {
  const { data: logs = [] } = useAuditLogs();
  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Governance" title="Audit Trail" description="Immutable log of every action taken in the Lead Manager." />
      <StatTile label="Recorded actions" value={logs.length} icon={<ScrollText className="h-4 w-4" />} className="max-w-xs" />
      <Panel title="Recent entries" bodyClassName="space-y-2">
        {logs.length === 0 ? <EmptyState title="No audit entries yet" /> : null}
        {logs.map((l) => (
          <div key={l.id} className="rounded-xl border border-border bg-secondary/30 px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-foreground">{l.action}</p>
              <span className="text-[10px] text-muted-foreground">{formatDateTime(l.created_at)}</span>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              {l.actor} · {l.module} · {JSON.stringify(l.meta_json)}
            </p>
          </div>
        ))}
      </Panel>
    </div>
  );
}

/* ------------------------------- profile ----------------------------------- */

export function ManagerProfile() {
  const { data: leads = [] } = useLeads();
  const { data: team = [] } = useTeam();
  const me = team.find((t) => t.vala_id === "vala(manager)1001");
  const owned = leads.filter((l) => l.assigned_to === "vala(manager)1001");

  return (
    <div className="space-y-5">
      <SectionHeader eyebrow="Account" title="Manager Profile" description="Your Software Vala identity and workload." />
      <Panel bodyClassName="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-command text-lg font-bold text-primary-foreground">VM</div>
        <div>
          <p className="text-lg font-semibold text-foreground">{me?.full_name ?? "Vala Manager"}</p>
          <p className="font-mono text-xs text-muted-foreground">vala(manager)1001 · {me?.role ?? "Lead Manager"} · {me?.region ?? "Global"}</p>
          <p className="text-xs text-muted-foreground">{me?.email ?? "manager@softwarevala.com"}</p>
        </div>
      </Panel>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Leads owned" value={owned.length} />
        <StatTile label="Won" value={owned.filter((l) => l.status === "won").length} tone="success" />
        <StatTile label="Open value" value={formatCurrency(owned.filter((l) => l.status !== "won" && l.status !== "lost").reduce((s, l) => s + Number(l.expected_value), 0))} tone="primary" />
        <StatTile label="Avg score" value={owned.length ? Math.round(owned.reduce((s, l) => s + l.ai_score, 0) / owned.length) : 0} tone="info" />
      </div>
      <Panel title="Capacity" bodyClassName="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Workload</span>
          <span className={cn("tabular-nums", scoreTone(percent(owned.length, me?.capacity ?? 1)))}>
            {owned.length}/{me?.capacity ?? 0}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full gradient-command" style={{ width: `${Math.min(100, percent(owned.length, me?.capacity ?? 1))}%` }} />
        </div>
      </Panel>
    </div>
  );
}
