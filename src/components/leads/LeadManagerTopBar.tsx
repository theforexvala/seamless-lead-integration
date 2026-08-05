import { Bell, Brain, Menu, RefreshCw, Search, ShieldCheck, Target } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "@/lib/leads/hooks";

export function LeadManagerTopBar({
  search,
  onSearchChange,
  onAIClick,
  onNotificationsClick,
  onToggleSidebar,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onAIClick: () => void;
  onNotificationsClick: () => void;
  onToggleSidebar?: () => void;
}) {
  const qc = useQueryClient();
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="flex h-full items-center gap-4 px-4">
        <button
          onClick={onToggleSidebar}
          className="focus-ring rounded-xl border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-command shadow-[var(--shadow-glow)]">
            <Target className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-foreground">Software Vala</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent">
              Lead Manager
            </p>
          </div>
        </div>

        <div className="relative ml-4 hidden max-w-md flex-1 items-center md:flex">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search leads, companies, software interest…"
            className="focus-ring h-9 w-full rounded-xl border border-border bg-secondary/60 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
            aria-label="Search leads"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success lg:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" /> Masked mode active
          </span>
          <button
            onClick={() => qc.invalidateQueries()}
            title="Refresh live data"
            className="focus-ring rounded-xl border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={onAIClick}
            className="focus-ring inline-flex items-center gap-2 rounded-xl gradient-command px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            <Brain className="h-4 w-4" /> <span className="hidden sm:inline">AI Actions</span>
          </button>
          <button
            onClick={onNotificationsClick}
            className="focus-ring relative rounded-xl border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={`${unread} unread notifications`}
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unread}
              </span>
            ) : null}
          </button>
          <div className="ml-1 hidden items-center gap-2 rounded-xl border border-border px-2.5 py-1.5 sm:flex">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg gradient-signal text-[10px] font-bold text-primary-foreground">
              VM
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">vala(manager)1001</span>
          </div>
        </div>
      </div>
    </header>
  );
}
