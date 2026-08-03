import { useState } from "react";
import { AlertTriangle, BellRing, Loader2, ShieldOff, Trash2, X } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/leads/types";
import { LEAD_STATUSES, PRIORITY_META, STAGES } from "@/lib/leads/types";
import {
  useActivities,
  useAlertMutations,
  useBehaviorEvents,
  useComplianceMutations,
  useConsents,
  useEscalationMutations,
  useFollowupMutations,
  useFollowups,
  useLeadMutations,
  useLeadNotes,
  useTeam,
} from "@/lib/leads/hooks";
import { formatCurrency, formatDateTime, initials, relativeTime, scoreTone } from "@/lib/leads/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "./common/Primitives";

const TABS = ["overview", "activity", "notes", "followups", "behavior", "compliance"] as const;
type Tab = (typeof TABS)[number];

export function LeadDetails({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [note, setNote] = useState("");
  const [followTitle, setFollowTitle] = useState("");
  const [followChannel, setFollowChannel] = useState("call");
  const [followWhen, setFollowWhen] = useState("");
  const [escalationReason, setEscalationReason] = useState("");

  const leadId = lead?.id ?? null;
  const { data: notes = [] } = useLeadNotes(leadId);
  const { data: activities = [] } = useActivities(leadId ?? undefined);
  const { data: followups = [] } = useFollowups(leadId ?? undefined);
  const { data: behavior = [] } = useBehaviorEvents(leadId ?? undefined);
  const { data: consents = [] } = useConsents(leadId ?? undefined);
  const { data: team = [] } = useTeam();

  const { changeStatus, assign, addNote, remove, updateLead } = useLeadMutations();
  const followupMutations = useFollowupMutations();
  const escalationMutations = useEscalationMutations();
  const alerts = useAlertMutations();
  const compliance = useComplianceMutations();

  if (!lead) return null;
  const stage = STAGES[lead.status];
  const priority = PRIORITY_META[lead.priority];

  const label = "text-[10px] font-medium uppercase tracking-wider text-muted-foreground";
  const field =
    "focus-ring h-9 w-full rounded-lg border border-border bg-secondary/60 px-3 text-sm text-foreground";

  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-card/95 backdrop-blur-xl"
      >
        <header className="flex items-start gap-3 border-b border-border p-5">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground", stage.gradientClass)}>
            {initials(lead.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-foreground">{lead.full_name}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {lead.company ?? "Independent"} · {lead.software_interest}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold", stage.borderClass, stage.bgClass, stage.textClass)}>
                {stage.label}
              </span>
              <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase", priority.bgClass, priority.textClass)}>
                {priority.label}
              </span>
              {lead.tags.map((t) => (
                <span key={t} className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {tab === "overview" ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: "AI score", v: lead.ai_score, tone: scoreTone(lead.ai_score) },
                  { l: "Urgency", v: lead.urgency_score, tone: "text-warning" },
                  { l: "Quality", v: lead.quality_score, tone: "text-info" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-border bg-secondary/40 p-3">
                    <p className={label}>{s.l}</p>
                    <p className={cn("mt-1 text-xl font-semibold tabular-nums", s.tone)}>{s.v}</p>
                  </div>
                ))}
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Email", lead.email],
                  ["Phone", lead.phone ?? "—"],
                  ["Source", lead.source],
                  ["Region", `${lead.city ? `${lead.city}, ` : ""}${lead.region}`],
                  ["Budget", lead.budget_range ?? "—"],
                  ["Expected value", formatCurrency(lead.expected_value)],
                  ["Conversion", `${lead.conversion_probability}%`],
                  ["Assigned", lead.assigned_to ? `${lead.assigned_to} (${lead.assigned_role ?? "—"})` : "Unassigned"],
                  ["Consent", lead.consent_given ? `Granted · ${lead.consent_channel ?? "n/a"}` : "Not captured"],
                  ["Created", formatDateTime(lead.created_at)],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
                    <dt className={label}>{k}</dt>
                    <dd className="truncate text-xs text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className={label}>Move stage</p>
                <div className="flex flex-wrap gap-1.5">
                  {LEAD_STATUSES.map((s: LeadStatus) => (
                    <button
                      key={s}
                      disabled={changeStatus.isPending || s === lead.status}
                      onClick={() => changeStatus.mutate({ id: lead.id, status: s })}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40",
                        STAGES[s].borderClass,
                        STAGES[s].textClass,
                        "hover:bg-secondary",
                      )}
                    >
                      {STAGES[s].short}
                    </button>
                  ))}
                </div>

                <p className={cn(label, "pt-2")}>Reassign owner</p>
                <select
                  className={field}
                  value={lead.assigned_to ?? ""}
                  onChange={(e) => {
                    const member = team.find((m) => m.vala_id === e.target.value);
                    if (member) assign.mutate({ id: lead.id, to: member.vala_id, role: member.role });
                  }}
                >
                  <option value="">Unassigned</option>
                  {team.filter((m) => m.active).map((m) => (
                    <option key={m.id} value={m.vala_id}>
                      {m.full_name} — {m.role} ({m.region})
                    </option>
                  ))}
                </select>

                <p className={cn(label, "pt-2")}>Priority</p>
                <select
                  className={field}
                  value={lead.priority}
                  onChange={(e) => updateLead.mutate({ id: lead.id, patch: { priority: e.target.value as Lead["priority"] } })}
                >
                  {Object.keys(PRIORITY_META).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    alerts.create.mutate({
                      lead_id: lead.id,
                      title: `Hot lead — ${lead.full_name}`,
                      message: `${lead.software_interest} · ${formatCurrency(lead.expected_value)} · owner ${lead.assigned_to ?? "unassigned"}`,
                      severity: lead.priority === "hot" ? "critical" : "warning",
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-warning/45 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning"
                >
                  <BellRing className="h-3.5 w-3.5" /> Raise buzzer
                </button>
                <button
                  onClick={() => compliance.setDoNotContact.mutate({ leadId: lead.id, value: !lead.do_not_contact })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                  {lead.do_not_contact ? "Allow contact" : "Do not contact"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${lead.full_name}? This cannot be undone.`)) {
                      remove.mutate(lead.id);
                      onClose();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>

              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className={label}>Escalate to management</p>
                <input
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Reason (SLA breach, pricing approval…)"
                  className={field}
                />
                <button
                  disabled={!escalationReason.trim() || escalationMutations.create.isPending}
                  onClick={() =>
                    escalationMutations.create.mutate(
                      { lead_id: lead.id, reason: escalationReason.trim(), level: 1, assigned_to: lead.assigned_to, sla_minutes: 120 },
                      { onSuccess: () => setEscalationReason("") },
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Raise escalation
                </button>
              </div>
            </>
          ) : null}

          {tab === "activity" ? (
            activities.length === 0 ? (
              <EmptyState title="No activity yet" description="Actions on this lead will appear here." />
            ) : (
              <ol className="space-y-3 border-l border-border pl-4">
                {activities.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <p className="text-sm font-medium text-foreground">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {a.actor} · {a.channel} · {relativeTime(a.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            )
          ) : null}

          {tab === "notes" ? (
            <>
              <div className="space-y-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Add an internal note…"
                  className="focus-ring w-full rounded-lg border border-border bg-secondary/60 p-3 text-sm text-foreground"
                />
                <button
                  disabled={!note.trim() || addNote.isPending}
                  onClick={() => addNote.mutate({ leadId: lead.id, body: note.trim() }, { onSuccess: () => setNote("") })}
                  className="rounded-lg gradient-command px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {addNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save note"}
                </button>
              </div>
              {notes.map((n) => (
                <div key={n.id} className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-sm text-foreground">{n.body}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {n.author} · {relativeTime(n.created_at)}
                  </p>
                </div>
              ))}
            </>
          ) : null}

          {tab === "followups" ? (
            <>
              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className={label}>Schedule follow-up</p>
                <input value={followTitle} onChange={(e) => setFollowTitle(e.target.value)} placeholder="Title" className={field} />
                <div className="grid grid-cols-2 gap-2">
                  <select value={followChannel} onChange={(e) => setFollowChannel(e.target.value)} className={field}>
                    {["call", "email", "whatsapp", "sms", "meeting"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input type="datetime-local" value={followWhen} onChange={(e) => setFollowWhen(e.target.value)} className={field} />
                </div>
                <button
                  disabled={!followTitle.trim() || !followWhen}
                  onClick={() =>
                    followupMutations.create.mutate(
                      {
                        lead_id: lead.id,
                        title: followTitle.trim(),
                        channel: followChannel,
                        scheduled_at: new Date(followWhen).toISOString(),
                        assigned_to: lead.assigned_to,
                      },
                      { onSuccess: () => { setFollowTitle(""); setFollowWhen(""); } },
                    )
                  }
                  className="rounded-lg gradient-command px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Schedule
                </button>
              </div>
              {followups.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{f.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {f.channel} · {formatDateTime(f.scheduled_at)} · {f.status}
                    </p>
                  </div>
                  {f.status !== "completed" ? (
                    <button
                      onClick={() => followupMutations.update.mutate({ id: f.id, patch: { status: "completed" } })}
                      className="rounded-lg border border-success/45 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success"
                    >
                      Complete
                    </button>
                  ) : null}
                  <button
                    onClick={() => followupMutations.remove.mutate(f.id)}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </>
          ) : null}

          {tab === "behavior" ? (
            behavior.length === 0 ? (
              <EmptyState title="No tracked behaviour" description="Website and product events will show here." />
            ) : (
              behavior.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2">
                  <div>
                    <p className="text-sm text-foreground">{b.event_type}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {b.page ?? "—"} · {b.device}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs tabular-nums text-foreground">{b.duration_seconds}s</p>
                    <p className="text-[10px] text-muted-foreground">{relativeTime(b.created_at)}</p>
                  </div>
                </div>
              ))
            )
          ) : null}

          {tab === "compliance" ? (
            <>
              <div className="rounded-xl border border-border p-3">
                <p className={label}>Contact status</p>
                <p className={cn("mt-1 text-sm font-semibold", lead.do_not_contact ? "text-destructive" : "text-success")}>
                  {lead.do_not_contact ? "Do not contact" : "Contactable"}
                </p>
              </div>
              {consents.length === 0 ? (
                <EmptyState title="No consent records" description="Consent captured at source will be listed here." />
              ) : (
                consents.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2">
                    <div>
                      <p className="text-sm text-foreground">{c.channel}</p>
                      <p className="text-[11px] text-muted-foreground">via {c.captured_via}</p>
                    </div>
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", c.granted ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                      {c.granted ? "Granted" : "Withdrawn"}
                    </span>
                  </div>
                ))
              )}
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
