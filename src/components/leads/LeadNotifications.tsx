import { useState } from "react";
import { Check, CheckCheck, X } from "lucide-react";
import { useNotificationMutations, useNotifications } from "@/lib/leads/hooks";
import { relativeTime } from "@/lib/leads/format";
import { EmptyState, Panel } from "./common/Primitives";
import { cn } from "@/lib/utils";

const TYPE_TONE: Record<string, string> = {
  info: "border-info/40 bg-info/10 text-info",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
};

/** Full notification centre section. */
export function NotificationCenter() {
  const { data: notifications = [], isLoading } = useNotifications();
  const { markRead, markAllRead } = useNotificationMutations();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const rows = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <Panel
      title="Notification Centre"
      description="Live system events raised by the lead engine"
      actions={
        <>
          <div className="flex rounded-lg border border-border p-0.5">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  filter === f ? "bg-primary/20 text-primary" : "text-muted-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => markAllRead.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        </>
      }
      bodyClassName="space-y-2"
    >
      {isLoading ? <p className="text-sm text-muted-foreground">Loading notifications…</p> : null}
      {!isLoading && rows.length === 0 ? (
        <EmptyState title="No notifications" description="You are all caught up." />
      ) : null}
      {rows.map((n) => (
        <div
          key={n.id}
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3",
            TYPE_TONE[n.type] ?? TYPE_TONE.info,
            n.read && "opacity-60",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">{n.message}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{relativeTime(n.created_at)}</p>
          </div>
          {!n.read ? (
            <button
              onClick={() => markRead.mutate(n.id)}
              title="Mark read"
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ))}
    </Panel>
  );
}

/** Floating toast-style stack shown over every section. */
export function NotificationDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: notifications = [] } = useNotifications();
  const { markRead } = useNotificationMutations();
  if (!open) return null;
  const recent = notifications.filter((n) => !n.read).slice(0, 5);

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 space-y-2">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card/95 px-3 py-2 backdrop-blur-xl">
        <span className="text-xs font-semibold text-foreground">Live alerts</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      {recent.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/95 px-4 py-3 text-xs text-muted-foreground backdrop-blur-xl">
          No unread alerts.
        </div>
      ) : null}
      {recent.map((n) => (
        <div
          key={n.id}
          className={cn(
            "rounded-xl border bg-card/95 px-4 py-3 backdrop-blur-xl",
            TYPE_TONE[n.type] ?? TYPE_TONE.info,
          )}
        >
          <p className="text-xs text-foreground">{n.message}</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{relativeTime(n.created_at)}</span>
            <button
              onClick={() => markRead.mutate(n.id)}
              className="text-[10px] font-semibold text-primary hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
