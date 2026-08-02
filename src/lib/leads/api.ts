import { supabase } from "@/integrations/supabase/client";
import type {
  BehaviorEvent,
  BuzzerAlert,
  CompliancePolicy,
  FollowupRule,
  Lead,
  LeadActivity,
  LeadConsent,
  LeadEscalation,
  LeadFollowup,
  LeadInsert,
  LeadNote,
  LeadNotification,
  LeadSource,
  LeadStatus,
  LeadUpdate,
  QualificationRule,
  ScoringFactor,
  TeamMember,
  Territory,
  AuditLog,
} from "./types";

/** Immutable audit trail — every mutation in the module writes here. */
export async function logAction(
  action: string,
  meta: Record<string, unknown> = {},
  actor = "vala(manager)1001",
) {
  const { error } = await supabase
    .from("audit_logs")
    .insert({ action, module: "lead_manager", actor, meta_json: meta as never });
  if (error) console.error("[audit]", error.message);
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

/* ------------------------------- leads ---------------------------------- */

export interface LeadFilters {
  status?: LeadStatus | "all";
  region?: string | "all";
  source?: string | "all";
  assignedTo?: string | "all";
  search?: string;
}

export async function fetchLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  let query = supabase.from("leads").select("*").order("last_action_at", { ascending: false });
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.region && filters.region !== "all") query = query.eq("region", filters.region);
  if (filters.source && filters.source !== "all") query = query.eq("source", filters.source);
  if (filters.assignedTo && filters.assignedTo !== "all")
    query = query.eq("assigned_to", filters.assignedTo);
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `full_name.ilike.${term},email.ilike.${term},company.ilike.${term},software_interest.ilike.${term}`,
    );
  }
  return unwrap<Lead[]>(await query);
}

export async function fetchLead(id: string): Promise<Lead | null> {
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createLead(payload: LeadInsert): Promise<Lead> {
  const { data, error } = await supabase.from("leads").insert(payload).select().single();
  if (error) throw new Error(error.message);
  await supabase.from("lead_activities").insert({
    lead_id: data.id,
    actor: "lead_manager",
    action: "Lead captured",
    detail: `Captured from ${data.source}`,
    channel: "system",
  });
  await supabase.from("lead_notifications").insert({
    lead_id: data.id,
    message: `New lead added — AI is reviewing interest category for ${data.software_interest}.`,
    type: "info",
  });
  await logAction("lead_created", { lead_id: data.id, source: data.source });
  return data;
}

export async function updateLead(id: string, patch: LeadUpdate): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await logAction("lead_updated", { lead_id: id, fields: Object.keys(patch) });
  return data;
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  actor = "vala(manager)1001",
): Promise<Lead> {
  const labels: Record<LeadStatus, string> = {
    new: "Reopened as new",
    contacted: "Follow-up call made",
    demo: "Demo delivered",
    negotiation: "Quote sent",
    won: "Contract signed",
    lost: "Marked unresponsive",
  };
  const lead = await updateLead(id, {
    status,
    last_action: labels[status],
    last_action_at: new Date().toISOString(),
    qualified: status !== "new",
  });
  await supabase.from("lead_activities").insert({
    lead_id: id,
    actor,
    action: labels[status],
    detail: `Status moved to ${status}`,
    channel: "system",
  });
  await supabase.from("lead_notifications").insert({
    lead_id: id,
    message: `Moved to ${status.toUpperCase()} by ${actor}`,
    type: "success",
  });
  await logAction("lead_status_changed", { lead_id: id, status });
  return lead;
}

export async function assignLead(
  id: string,
  assignedTo: string,
  assignedRole: string,
): Promise<Lead> {
  const lead = await updateLead(id, {
    assigned_to: assignedTo,
    assigned_role: assignedRole,
    last_action: "Lead assigned",
    last_action_at: new Date().toISOString(),
  });
  await supabase.from("lead_activities").insert({
    lead_id: id,
    actor: "vala(manager)1001",
    action: "Lead assigned",
    detail: `Routed to ${assignedTo} (${assignedRole})`,
    channel: "system",
  });
  await logAction("lead_assigned", { lead_id: id, assigned_to: assignedTo });
  return lead;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAction("lead_deleted", { lead_id: id });
}

export async function bulkUpdateStatus(ids: string[], status: LeadStatus): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ status, last_action_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw new Error(error.message);
  await logAction("lead_bulk_status", { ids, status });
}

/* ------------------------- notes / activity ----------------------------- */

export async function fetchNotes(leadId: string): Promise<LeadNote[]> {
  return unwrap<LeadNote[]>(
    await supabase
      .from("lead_notes")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
  );
}

export async function addNote(leadId: string, body: string, author = "vala(manager)1001") {
  const { data, error } = await supabase
    .from("lead_notes")
    .insert({ lead_id: leadId, body, author })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await logAction("lead_note_added", { lead_id: leadId });
  return data;
}

export async function fetchActivities(leadId?: string, limit = 60): Promise<LeadActivity[]> {
  let query = supabase
    .from("lead_activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (leadId) query = query.eq("lead_id", leadId);
  return unwrap<LeadActivity[]>(await query);
}

export async function logActivity(
  leadId: string,
  action: string,
  detail: string,
  channel = "system",
  actor = "vala(manager)1001",
) {
  const { error } = await supabase
    .from("lead_activities")
    .insert({ lead_id: leadId, action, detail, channel, actor });
  if (error) throw new Error(error.message);
  await logAction("lead_activity_logged", { lead_id: leadId, action });
}

/* ----------------------------- follow-ups -------------------------------- */

export async function fetchFollowups(leadId?: string): Promise<LeadFollowup[]> {
  let query = supabase
    .from("lead_followups")
    .select("*")
    .order("scheduled_at", { ascending: true });
  if (leadId) query = query.eq("lead_id", leadId);
  return unwrap<LeadFollowup[]>(await query);
}

export async function createFollowup(payload: {
  lead_id: string;
  title: string;
  channel: string;
  scheduled_at: string;
  assigned_to?: string | null;
  notes?: string | null;
  rule_id?: string | null;
}) {
  const { data, error } = await supabase.from("lead_followups").insert(payload).select().single();
  if (error) throw new Error(error.message);
  await logAction("followup_created", { lead_id: payload.lead_id });
  return data;
}

export async function updateFollowup(id: string, patch: Partial<LeadFollowup>) {
  const { data, error } = await supabase
    .from("lead_followups")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await logAction("followup_updated", { followup_id: id, patch: Object.keys(patch) });
  return data;
}

export async function deleteFollowup(id: string) {
  const { error } = await supabase.from("lead_followups").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAction("followup_deleted", { followup_id: id });
}

export async function fetchFollowupRules(): Promise<FollowupRule[]> {
  return unwrap<FollowupRule[]>(
    await supabase.from("followup_rules").select("*").order("created_at", { ascending: true }),
  );
}

export async function upsertFollowupRule(rule: Partial<FollowupRule> & { name: string; trigger_event: string }) {
  const { data, error } = await supabase
    .from("followup_rules")
    .upsert(rule as never)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await logAction("followup_rule_saved", { rule: rule.name });
  return data;
}

export async function toggleFollowupRule(id: string, active: boolean) {
  const { error } = await supabase.from("followup_rules").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAction("followup_rule_toggled", { rule_id: id, active });
}

/* ---------------------------- escalations -------------------------------- */

export async function fetchEscalations(): Promise<LeadEscalation[]> {
  return unwrap<LeadEscalation[]>(
    await supabase.from("lead_escalations").select("*").order("created_at", { ascending: false }),
  );
}

export async function createEscalation(payload: {
  lead_id: string;
  reason: string;
  level: number;
  assigned_to?: string | null;
  sla_minutes?: number;
}) {
  const { data, error } = await supabase
    .from("lead_escalations")
    .insert({ ...payload, raised_by: "vala(manager)1001" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await logAction("escalation_created", { lead_id: payload.lead_id, level: payload.level });
  return data;
}

export async function updateEscalation(id: string, patch: Partial<LeadEscalation>) {
  const { data, error } = await supabase
    .from("lead_escalations")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await logAction("escalation_updated", { escalation_id: id });
  return data;
}

export async function resolveEscalation(id: string, resolution: string) {
  return updateEscalation(id, {
    status: "resolved",
    resolution,
    resolved_at: new Date().toISOString(),
  });
}

/* ------------------------------- buzzer ---------------------------------- */

export async function fetchBuzzerAlerts(): Promise<BuzzerAlert[]> {
  return unwrap<BuzzerAlert[]>(
    await supabase
      .from("lead_buzzer_alerts")
      .select("*")
      .order("created_at", { ascending: false }),
  );
}

export async function acknowledgeAlert(id: string, by = "vala(manager)1001") {
  const { error } = await supabase
    .from("lead_buzzer_alerts")
    .update({ acknowledged: true, acknowledged_by: by })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await logAction("buzzer_acknowledged", { alert_id: id });
}

export async function createAlert(payload: {
  lead_id: string;
  title: string;
  message: string;
  severity: string;
}) {
  const { error } = await supabase.from("lead_buzzer_alerts").insert(payload);
  if (error) throw new Error(error.message);
  await logAction("buzzer_created", { lead_id: payload.lead_id });
}

/* --------------------------- notifications ------------------------------- */

export async function fetchNotifications(): Promise<LeadNotification[]> {
  return unwrap<LeadNotification[]>(
    await supabase
      .from("lead_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  );
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from("lead_notifications").update({ read: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from("lead_notifications")
    .update({ read: true })
    .eq("read", false);
  if (error) throw new Error(error.message);
  await logAction("notifications_all_read", {});
}

/* --------------------- qualification / scoring --------------------------- */

export async function fetchQualificationRules(): Promise<QualificationRule[]> {
  return unwrap<QualificationRule[]>(
    await supabase.from("qualification_rules").select("*").order("weight", { ascending: false }),
  );
}

export async function toggleQualificationRule(id: string, active: boolean) {
  const { error } = await supabase.from("qualification_rules").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAction("qualification_rule_toggled", { rule_id: id, active });
}

export async function createQualificationRule(payload: {
  name: string;
  criteria: string;
  weight: number;
  auto_action: string;
}) {
  const { error } = await supabase.from("qualification_rules").insert(payload);
  if (error) throw new Error(error.message);
  await logAction("qualification_rule_created", { name: payload.name });
}

export async function fetchScoringFactors(): Promise<ScoringFactor[]> {
  return unwrap<ScoringFactor[]>(
    await supabase.from("scoring_factors").select("*").order("weight", { ascending: false }),
  );
}

export async function updateScoringFactor(id: string, weight: number) {
  const { error } = await supabase.from("scoring_factors").update({ weight }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAction("scoring_factor_updated", { factor_id: id, weight });
}

/* ------------------------------ behaviour -------------------------------- */

export async function fetchBehaviorEvents(leadId?: string, limit = 300): Promise<BehaviorEvent[]> {
  let query = supabase
    .from("lead_behavior_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (leadId) query = query.eq("lead_id", leadId);
  return unwrap<BehaviorEvent[]>(await query);
}

/* ------------------------------ compliance ------------------------------- */

export async function fetchCompliancePolicies(): Promise<CompliancePolicy[]> {
  return unwrap<CompliancePolicy[]>(
    await supabase.from("compliance_policies").select("*").order("title", { ascending: true }),
  );
}

export async function updatePolicyStatus(id: string, status: string) {
  const { error } = await supabase
    .from("compliance_policies")
    .update({ status, last_reviewed: new Date().toISOString().slice(0, 10) })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await logAction("policy_reviewed", { policy_id: id, status });
}

export async function fetchConsents(leadId?: string): Promise<LeadConsent[]> {
  let query = supabase
    .from("lead_consents")
    .select("*")
    .order("captured_at", { ascending: false })
    .limit(400);
  if (leadId) query = query.eq("lead_id", leadId);
  return unwrap<LeadConsent[]>(await query);
}

export async function setDoNotContact(leadId: string, value: boolean) {
  await updateLead(leadId, { do_not_contact: value });
  await logAction("do_not_contact_changed", { lead_id: leadId, value });
}

/* ------------------------ reference collections -------------------------- */

export async function fetchTerritories(): Promise<Territory[]> {
  return unwrap<Territory[]>(
    await supabase.from("territories").select("*").order("name", { ascending: true }),
  );
}

export async function fetchSources(): Promise<LeadSource[]> {
  return unwrap<LeadSource[]>(
    await supabase.from("lead_sources").select("*").order("name", { ascending: true }),
  );
}

export async function fetchTeam(): Promise<TeamMember[]> {
  return unwrap<TeamMember[]>(
    await supabase.from("team_members").select("*").order("full_name", { ascending: true }),
  );
}

export async function fetchAuditLogs(limit = 100): Promise<AuditLog[]> {
  return unwrap<AuditLog[]>(
    await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}
