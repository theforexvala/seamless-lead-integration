import { useMemo, useState } from "react";
import { Filter, LayoutGrid, List } from "lucide-react";
import { useLeadMutations, useLeads, useSources, useTeam, useTerritories } from "@/lib/leads/hooks";
import type { Lead, LeadStatus } from "@/lib/leads/types";
import { LEAD_STATUSES, STAGES } from "@/lib/leads/types";
import { formatCurrency } from "@/lib/leads/format";
import { EmptyState, PanelSkeleton, QueryError, SectionHeader } from "./common/Primitives";
import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";

export function LeadPipeline({ search, onOpenLead }: { search: string; onOpenLead: (lead: Lead) => void }) {
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [region, setRegion] = useState("all");
  const [source, setSource] = useState("all");
  const [owner, setOwner] = useState("all");
  const [view, setView] = useState<"board" | "list">("board");
  const [selected, setSelected] = useState<string[]>([]);

  const { data: leads = [], isLoading, error, refetch } = useLeads({
    status,
    region,
    source,
    assignedTo: owner,
    search,
  });
  const { data: territories = [] } = useTerritories();
  const { data: sources = [] } = useSources();
  const { data: team = [] } = useTeam();
  const { bulkStatus } = useLeadMutations();

  const grouped = useMemo(() => {
    const map = {} as Record<LeadStatus, Lead[]>;
    LEAD_STATUSES.forEach((s) => (map[s] = []));
    leads.forEach((l) => map[l.status].push(l));
    return map;
  }, [leads]);

  const regions = Array.from(new Set(territories.map((t) => t.country))).sort();
  const control =
    "focus-ring h-9 rounded-lg border border-border bg-secondary/60 px-3 text-xs text-foreground";

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Pipeline"
        title="Lead Pipeline"
        description="Every captured lead across the six-stage Software Vala funnel."
        actions={
          <div className="flex rounded-lg border border-border p-0.5">
            <button onClick={() => setView("board")} className={cn("rounded-md p-1.5", view === "board" ? "bg-primary/20 text-primary" : "text-muted-foreground")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setView("list")} className={cn("rounded-md p-1.5", view === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground")}>
              <List className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="glass-panel flex flex-wrap items-center gap-2 p-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select className={control} value={status} onChange={(e) => setStatus(e.target.value as LeadStatus | "all")}>
          <option value="all">All stages</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{STAGES[s].label}</option>
          ))}
        </select>
        <select className={control} value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="all">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select className={control} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
        <select className={control} value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="all">All owners</option>
          {team.map((t) => (
            <option key={t.id} value={t.vala_id}>{t.full_name}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {leads.length} leads · {formatCurrency(leads.reduce((s, l) => s + Number(l.expected_value), 0))} pipeline
        </span>
      </div>

      {selected.length > 0 ? (
        <div className="glass-panel flex flex-wrap items-center gap-2 p-3">
          <span className="text-xs font-medium text-foreground">{selected.length} selected</span>
          {LEAD_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => bulkStatus.mutate({ ids: selected, status: s }, { onSuccess: () => setSelected([]) })}
              className={cn("rounded-lg border px-2.5 py-1 text-[11px] font-semibold", STAGES[s].borderClass, STAGES[s].textClass)}
            >
              → {STAGES[s].short}
            </button>
          ))}
          <button onClick={() => setSelected([])} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
        </div>
      ) : null}

      {error ? <QueryError error={error as Error} onRetry={() => refetch()} /> : null}
      {isLoading ? <PanelSkeleton rows={5} /> : null}

      {!isLoading && leads.length === 0 ? (
        <EmptyState title="No leads match these filters" description="Adjust filters or capture a new lead." />
      ) : null}

      {!isLoading && leads.length > 0 && view === "board" ? (
        <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
          {LEAD_STATUSES.map((s) => (
            <section key={s} className="flex flex-col gap-3">
              <header className={cn("flex items-center justify-between rounded-xl border px-3 py-2", STAGES[s].borderClass, STAGES[s].bgClass)}>
                <span className={cn("text-xs font-bold tracking-wide", STAGES[s].textClass)}>{STAGES[s].label}</span>
                <span className="rounded-md bg-background/50 px-1.5 text-[11px] font-semibold text-foreground">
                  {grouped[s].length}
                </span>
              </header>
              <div className="space-y-3">
                {grouped[s].map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onOpen={onOpenLead} selected={selected.includes(lead.id)} onToggleSelect={toggle} compact />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {!isLoading && leads.length > 0 && view === "list" ? (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onOpen={onOpenLead} selected={selected.includes(lead.id)} onToggleSelect={toggle} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
