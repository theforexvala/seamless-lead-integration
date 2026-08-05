import { useMemo } from "react";
import { Brain, Copy, Flame, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { useLeadMutations, useLeads } from "@/lib/leads/hooks";
import { formatCurrency, relativeTime } from "@/lib/leads/format";
import type { Lead } from "@/lib/leads/types";
import { cn } from "@/lib/utils";


interface Recommendation {
  id: string;
  lead: Lead;
  title: string;
  reason: string;
  tone: string;
  action: () => void;
  cta: string;
}

const HOURS = (iso: string) => (Date.now() - new Date(iso).getTime()) / 36e5;

/**
 * Rule-based next-best-action engine. Every suggestion is derived from live
 * lead rows and executes a real mutation — nothing here is simulated.
 */
export function AIActionPanel({ open, onClose, onOpenLead }: { open: boolean; onClose: () => void; onOpenLead: (lead: Lead) => void }) {
  const { data: leads = [] } = useLeads();
  const { changeStatus, assign, logActivity } = useLeadMutations();

  const recommendations = useMemo<Recommendation[]>(() => {
    const out: Recommendation[] = [];
    for (const lead of leads) {
      if (lead.status === "won" || lead.status === "lost" || lead.do_not_contact) continue;
      const idle = HOURS(lead.last_action_at);

      if (!lead.assigned_to) {
        out.push({
          id: `assign-${lead.id}`,
          lead,
          title: `Route ${lead.full_name} to a regional owner`,
          reason: `Unassigned for ${Math.round(idle)}h in ${lead.region} · ${formatCurrency(lead.expected_value)} pipeline value`,
          tone: "border-warning/45 bg-warning/10 text-warning",
          cta: "Open router",
          action: () => onOpenLead(lead),
        });
      }
      if (lead.status === "new" && lead.ai_score >= 80) {
        out.push({
          id: `contact-${lead.id}`,
          lead,
          title: `Contact ${lead.full_name} now`,
          reason: `AI score ${lead.ai_score} · urgency ${lead.urgency_score} · ${lead.software_interest}`,
          tone: "border-primary/45 bg-primary/10 text-primary",
          cta: "Mark contacted",
          action: () => changeStatus.mutate({ id: lead.id, status: "contacted" }),
        });
      }
      if (lead.status === "contacted" && lead.conversion_probability >= 60) {
        out.push({
          id: `demo-${lead.id}`,
          lead,
          title: `Book a demo for ${lead.full_name}`,
          reason: `${lead.conversion_probability}% predicted conversion after first contact`,
          tone: "border-info/45 bg-info/10 text-info",
          cta: "Move to demo",
          action: () => changeStatus.mutate({ id: lead.id, status: "demo" }),
        });
      }
      if (idle > 72) {
        out.push({
          id: `stale-${lead.id}`,
          lead,
          title: `Re-engage ${lead.full_name}`,
          reason: `No activity since ${relativeTime(lead.last_action_at)} — SLA at risk`,
          tone: "border-destructive/45 bg-destructive/10 text-destructive",
          cta: "Log outreach",
          action: () =>
            logActivity.mutate({
              leadId: lead.id,
              action: "Re-engagement outreach",
              detail: "Manual outreach logged from AI action panel",
              channel: "email",
            }),
        });
      }
    }
    return out
      .sort((a, b) => b.lead.ai_score - a.lead.ai_score)
      .slice(0, 25);
  }, [leads, changeStatus, logActivity, onOpenLead]);

  const active = leads.filter((l) => l.status !== "won" && l.status !== "lost");
  const heat = {
    hot: active.filter((l) => l.priority === "hot").length,
    warm: active.filter((l) => l.priority === "warm").length,
    cold: active.filter((l) => l.priority === "cold").length,
  };

  const templates = [
    {
      id: "intro",
      label: "First contact",
      body: "Hello, this is Software Vala. Thank you for your interest in our software. Could we schedule a 15-minute call to understand your requirements?",
    },
    {
      id: "demo",
      label: "Demo invite",
      body: "We would love to show you a live demo tailored to your workflow. Which time suits you best — today or tomorrow?",
    },
    {
      id: "quote",
      label: "Quote follow-up",
      body: "Sharing the quotation for the modules we discussed. Let me know if you would like a revised scope or payment plan.",
    },
    {
      id: "reengage",
      label: "Re-engagement",
      body: "Just checking in on your software requirement. Should I keep the proposal open, or would a later date work better?",
    },
  ];

  if (!open) return null;
  void assign;

  return (
    <div className="fixed inset-0 z-[58] flex justify-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-card/95 backdrop-blur-xl"
      >
        <header className="flex items-center gap-3 border-b border-border p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-command">
            <Brain className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">AI Auto-Action Panel</h2>
            <p className="text-[11px] text-muted-foreground">
              {recommendations.length} recommendations from live pipeline signals
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary" aria-label="Close AI panel">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <section className="rounded-xl border border-border bg-secondary/30 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Flame className="h-3.5 w-3.5" /> Heat indicator
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              {([["Hot", heat.hot, "text-destructive"], ["Warm", heat.warm, "text-warning"], ["Cold", heat.cold, "text-info"]] as const).map(
                ([label, value, tone]) => (
                  <div key={label} className="rounded-lg border border-border bg-background/40 py-2">
                    <p className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                  </div>
                ),
              )}
            </div>
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="bg-destructive" style={{ width: `${(heat.hot / Math.max(1, active.length)) * 100}%` }} />
              <div className="bg-warning" style={{ width: `${(heat.warm / Math.max(1, active.length)) * 100}%` }} />
              <div className="bg-info" style={{ width: `${(heat.cold / Math.max(1, active.length)) * 100}%` }} />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-secondary/30 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Reply templates</p>
            <div className="mt-2 space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="rounded-lg border border-border bg-background/40 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">{t.label}</p>
                    <button
                      onClick={() => {
                        void navigator.clipboard?.writeText(t.body);
                        toast.success(`${t.label} template copied`);
                      }}
                      className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t.body}</p>
                </div>
              ))}
            </div>
          </section>

          <p className="pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">AI suggestions</p>
          {recommendations.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Pipeline is healthy — no actions required right now.
            </p>
          ) : null}

          {recommendations.map((r) => (
            <div key={r.id} className={cn("rounded-xl border p-4", r.tone)}>
              <div className="flex items-start gap-2">
                <Zap className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{r.reason}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={r.action}
                  className="rounded-lg gradient-command px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                >
                  {r.cta}
                </button>
                <button
                  onClick={() => onOpenLead(r.lead)}
                  className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary"
                >
                  View lead
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
