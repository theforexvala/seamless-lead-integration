import type { Tables, TablesInsert, TablesUpdate, Enums } from "@/integrations/supabase/types";

export type Lead = Tables<"leads">;
export type LeadInsert = TablesInsert<"leads">;
export type LeadUpdate = TablesUpdate<"leads">;
export type LeadNote = Tables<"lead_notes">;
export type LeadActivity = Tables<"lead_activities">;
export type LeadFollowup = Tables<"lead_followups">;
export type FollowupRule = Tables<"followup_rules">;
export type LeadEscalation = Tables<"lead_escalations">;
export type BuzzerAlert = Tables<"lead_buzzer_alerts">;
export type LeadNotification = Tables<"lead_notifications">;
export type QualificationRule = Tables<"qualification_rules">;
export type ScoringFactor = Tables<"scoring_factors">;
export type BehaviorEvent = Tables<"lead_behavior_events">;
export type CompliancePolicy = Tables<"compliance_policies">;
export type LeadConsent = Tables<"lead_consents">;
export type Territory = Tables<"territories">;
export type LeadSource = Tables<"lead_sources">;
export type TeamMember = Tables<"team_members">;
export type AuditLog = Tables<"audit_logs">;

export type LeadStatus = Enums<"lead_status">;
export type LeadPriority = Enums<"lead_priority">;
export type FollowupStatus = Enums<"followup_status">;
export type EscalationStatus = Enums<"escalation_status">;

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "demo",
  "negotiation",
  "won",
  "lost",
];

export const LEAD_PRIORITIES: LeadPriority[] = ["hot", "warm", "cold"];

export interface StageMeta {
  id: LeadStatus;
  label: string;
  short: string;
  gradientClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
}

export const STAGES: Record<LeadStatus, StageMeta> = {
  new: {
    id: "new",
    label: "NEW",
    short: "New",
    gradientClass: "bg-[image:var(--gradient-stage-new)]",
    textClass: "text-stage-new",
    bgClass: "bg-stage-new/15",
    borderClass: "border-stage-new/40",
  },
  contacted: {
    id: "contacted",
    label: "CONTACTED",
    short: "Contacted",
    gradientClass: "bg-[image:var(--gradient-stage-contacted)]",
    textClass: "text-stage-contacted",
    bgClass: "bg-stage-contacted/15",
    borderClass: "border-stage-contacted/40",
  },
  demo: {
    id: "demo",
    label: "DEMO SHOWN",
    short: "Demo",
    gradientClass: "bg-[image:var(--gradient-stage-demo)]",
    textClass: "text-stage-demo",
    bgClass: "bg-stage-demo/15",
    borderClass: "border-stage-demo/40",
  },
  negotiation: {
    id: "negotiation",
    label: "NEGOTIATION",
    short: "Negotiation",
    gradientClass: "bg-[image:var(--gradient-stage-negotiation)]",
    textClass: "text-stage-negotiation",
    bgClass: "bg-stage-negotiation/15",
    borderClass: "border-stage-negotiation/40",
  },
  won: {
    id: "won",
    label: "CLOSED WON",
    short: "Won",
    gradientClass: "bg-[image:var(--gradient-stage-won)]",
    textClass: "text-stage-won",
    bgClass: "bg-stage-won/15",
    borderClass: "border-stage-won/40",
  },
  lost: {
    id: "lost",
    label: "CLOSED LOST",
    short: "Lost",
    gradientClass: "bg-[image:var(--gradient-stage-lost)]",
    textClass: "text-stage-lost",
    bgClass: "bg-stage-lost/15",
    borderClass: "border-stage-lost/40",
  },
};

export const PRIORITY_META: Record<LeadPriority, { label: string; textClass: string; bgClass: string }> = {
  hot: { label: "Hot", textClass: "text-hot", bgClass: "bg-hot/15" },
  warm: { label: "Warm", textClass: "text-warm", bgClass: "bg-warm/15" },
  cold: { label: "Cold", textClass: "text-cold", bgClass: "bg-cold/15" },
};
