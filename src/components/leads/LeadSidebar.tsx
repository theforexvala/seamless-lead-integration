import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BellRing,
  Brain,
  Globe,
  LayoutDashboard,
  Plus,
  ScrollText,
  ShieldCheck,
  Target,
  Timer,
  UserPlus,
  Users,
  UserCircle,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionId =
  | "dashboard"
  | "pipeline"
  | "incoming"
  | "assignment"
  | "qualification"
  | "buzzer"
  | "territory"
  | "scoring"
  | "followup"
  | "escalation"
  | "compliance"
  | "behavior"
  | "analytics"
  | "notifications"
  | "audit"
  | "profile";

export const SECTIONS: { id: SectionId; label: string; icon: LucideIcon; group: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { id: "pipeline", label: "Lead Pipeline", icon: Users, group: "Overview" },
  { id: "incoming", label: "Incoming Leads", icon: BellRing, group: "Overview" },
  { id: "assignment", label: "Assignment", icon: UserPlus, group: "Routing" },
  { id: "territory", label: "Territory Map", icon: Globe, group: "Routing" },
  { id: "qualification", label: "AI Qualification", icon: Brain, group: "Intelligence" },
  { id: "scoring", label: "Lead Scoring", icon: Target, group: "Intelligence" },
  { id: "behavior", label: "Behavior", icon: Activity, group: "Intelligence" },
  { id: "followup", label: "Follow-ups", icon: Timer, group: "Execution" },
  { id: "buzzer", label: "Buzzer Alerts", icon: BellRing, group: "Execution" },
  { id: "escalation", label: "Escalation", icon: AlertTriangle, group: "Execution" },
  { id: "compliance", label: "Compliance", icon: ShieldCheck, group: "Governance" },
  { id: "analytics", label: "Analytics & Reports", icon: BarChart3, group: "Governance" },
  { id: "audit", label: "Audit Trail", icon: ScrollText, group: "Governance" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Account" },
  { id: "profile", label: "Profile", icon: UserCircle, group: "Account" },
];

export function LeadSidebar({
  active,
  onChange,
  onAddLead,
  badges,
  open,
  onClose,
}: {
  active: SectionId;
  onChange: (id: SectionId) => void;
  onAddLead: () => void;
  badges: Partial<Record<SectionId, number>>;
  open: boolean;
  onClose: () => void;
}) {
  const groups = Array.from(new Set(SECTIONS.map((s) => s.group)));

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" 
          onClick={onClose}
        />
      )}
      
      <aside className={cn(
        "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl transition-transform duration-300 md:top-16 md:h-[calc(100vh-4rem)]",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex items-center justify-between border-b border-sidebar-border p-4 md:hidden">
          <span className="text-sm font-bold">Menu</span>
          <button onClick={onClose} aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                {group}
              </p>
              <div className="space-y-1">
                {SECTIONS.filter((s) => s.group === group).map((item) => {
                  const isActive = active === item.id;
                  const badge = badges[item.id];
                  return (
                    <button
                      key={item.id}
                      onClick={() => onChange(item.id)}
                      className={cn(
                        "focus-ring group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                        isActive
                          ? "border border-primary/45 bg-primary/15 text-primary"
                          : "border border-transparent text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                      {badge ? (
                        <span className="ml-auto rounded-full bg-destructive/20 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                          {badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={onAddLead}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl gradient-command px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            <Plus className="h-4 w-4" /> Add Lead
          </button>
        </div>
      </aside>
    </>
  );
}
