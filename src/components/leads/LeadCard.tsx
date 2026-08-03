import { Building2, Clock, Flame, MapPin, ShieldOff, Sparkles } from "lucide-react";
import type { Lead } from "@/lib/leads/types";
import { PRIORITY_META, STAGES } from "@/lib/leads/types";
import { formatCurrency, initials, maskEmail, relativeTime, scoreTone } from "@/lib/leads/format";
import { cn } from "@/lib/utils";

export function LeadCard({
  lead,
  onOpen,
  selected,
  onToggleSelect,
  compact,
}: {
  lead: Lead;
  onOpen: (lead: Lead) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  compact?: boolean;
}) {
  const stage = STAGES[lead.status];
  const priority = PRIORITY_META[lead.priority];

  return (
    <article
      onClick={() => onOpen(lead)}
      className={cn(
        "glass-panel glass-panel-hover cursor-pointer p-4",
        selected && "border-primary/60 shadow-[var(--shadow-glow)]",
      )}
    >
      <div className="flex items-start gap-3">
        {onToggleSelect ? (
          <input
            type="checkbox"
            checked={!!selected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelect(lead.id)}
            className="mt-1 h-4 w-4 rounded border-border"
          />
        ) : null}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-primary-foreground",
            stage.gradientClass,
          )}
        >
          {initials(lead.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{lead.full_name}</p>
            {lead.do_not_contact ? (
              <ShieldOff className="h-3.5 w-3.5 text-destructive" aria-label="Do not contact" />
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{maskEmail(lead.email)}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            priority.bgClass,
            priority.textClass,
          )}
        >
          {priority.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {lead.company ? (
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {lead.company}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {lead.city ? `${lead.city}, ` : ""}
          {lead.region}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> {relativeTime(lead.last_action_at)}
        </span>
      </div>

      {!compact ? (
        <div className="mt-3 rounded-lg border border-border/70 bg-secondary/40 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Interest</p>
          <p className="text-xs font-medium text-foreground">{lead.software_interest}</p>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", scoreTone(lead.ai_score))}>
            <Sparkles className="h-3.5 w-3.5" /> {lead.ai_score}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-warning">
            <Flame className="h-3.5 w-3.5" /> {lead.urgency_score}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatCurrency(lead.expected_value)}
          </span>
        </div>
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
            stage.borderClass,
            stage.bgClass,
            stage.textClass,
          )}
        >
          {stage.label}
        </span>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full", stage.gradientClass)}
          style={{ width: `${Math.min(100, lead.conversion_probability)}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {lead.conversion_probability}% predicted conversion · {lead.last_action}
      </p>
    </article>
  );
}
