/**
 * Lead Manager parity regression check.
 *
 * Runs the real data layer (src/lib/leads/api.ts -> live Lovable Cloud API)
 * end-to-end across every Lead Manager domain using realistic seed data,
 * then removes everything it created.
 *
 * Usage:  bun run scripts/parity-check.ts
 * Exit code 0 = full parity, 1 = at least one domain failed.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  acknowledgeAlert,
  addNote,
  assignLead,
  bulkUpdateStatus,
  createAlert,
  createEscalation,
  createFollowup,
  createLead,
  createLeads,
  createQualificationRule,
  deleteFollowup,
  deleteLead,
  fetchActivities,
  fetchAuditLogs,
  fetchBehaviorEvents,
  fetchBuzzerAlerts,
  fetchCompliancePolicies,
  fetchConsents,
  fetchEscalations,
  fetchFollowupRules,
  fetchFollowups,
  fetchLead,
  fetchLeads,
  fetchNotes,
  fetchNotifications,
  fetchQualificationRules,
  fetchScoringFactors,
  fetchSources,
  fetchTeam,
  fetchTerritories,
  logActivity,
  markAllNotificationsRead,
  resolveEscalation,
  setDoNotContact,
  toggleFollowupRule,
  toggleQualificationRule,
  updateFollowup,
  updateLeadStatus,
  updatePolicyStatus,
  updateScoringFactor,
  updateSource,
} from "@/lib/leads/api";
import type { LeadInsert } from "@/lib/leads/types";

const RUN_TAG = `parity-${Date.now()}`;
const createdLeadIds: string[] = [];

let passed = 0;
let failed = 0;

async function check(domain: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${domain}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL  ${domain}: ${(error as Error).message}`);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function seedLead(overrides: Partial<LeadInsert> = {}): LeadInsert {
  return {
    full_name: "Ananya Krishnan",
    email: `ananya.krishnan+${RUN_TAG}@northbridge-retail.in`,
    phone: "+91 98450 22118",
    company: "Northbridge Retail Group",
    software_interest: "Retail POS Suite",
    status: "new",
    priority: "hot",
    source: "Website Demo Form",
    region: "APAC",
    country: "India",
    city: "Bengaluru",
    assigned_to: null,
    assigned_role: null,
    last_action: "Lead captured",
    last_action_at: new Date().toISOString(),
    urgency_score: 82,
    quality_score: 74,
    ai_score: 79,
    conversion_probability: 61,
    expected_value: 480000,
    budget_range: "₹4L – ₹6L",
    qualified: false,
    consent_given: true,
    consent_channel: "email",
    do_not_contact: false,
    tags: ["retail", "multi-store", RUN_TAG],
    ...overrides,
  };
}

async function main() {
  console.log(`Lead Manager parity check — run ${RUN_TAG}\n`);

  /* ------------------------------- leads -------------------------------- */
  let leadId = "";
  await check("leads · create + read", async () => {
    const lead = await createLead(seedLead());
    createdLeadIds.push(lead.id);
    leadId = lead.id;
    const fetched = await fetchLead(lead.id);
    assert(fetched?.email === lead.email, "created lead not readable back");
    const list = await fetchLeads({ search: "Northbridge" });
    assert(list.some((l) => l.id === lead.id), "lead missing from filtered list");
  });

  await check("leads · bulk import", async () => {
    const batch = await createLeads([
      seedLead({
        full_name: "Marcus Whitfield",
        email: `marcus.whitfield+${RUN_TAG}@harbourlogistics.co.uk`,
        company: "Harbour Logistics Ltd",
        software_interest: "Fleet Dispatch Cloud",
        region: "EMEA",
        country: "United Kingdom",
        city: "Manchester",
        source: "LinkedIn Campaign",
        priority: "warm",
      }),
      seedLead({
        full_name: "Sofia Marchetti",
        email: `sofia.marchetti+${RUN_TAG}@vellamanufacturing.it`,
        company: "Vella Manufacturing SpA",
        software_interest: "ERP Manufacturing Edition",
        region: "EMEA",
        country: "Italy",
        city: "Milan",
        source: "Trade Show — Hannover Messe",
        priority: "cold",
      }),
    ]);
    assert(batch.length === 2, "bulk import did not return 2 leads");
    batch.forEach((l) => createdLeadIds.push(l.id));
  });

  await check("leads · status transitions", async () => {
    for (const status of ["contacted", "demo", "negotiation", "won"] as const) {
      const updated = await updateLeadStatus(leadId, status);
      assert(updated.status === status, `status did not move to ${status}`);
    }
  });

  await check("leads · assignment routing", async () => {
    const team = await fetchTeam();
    assert(team.length > 0, "no team members available for routing");
    const member = team[0]!;
    const updated = await assignLead(leadId, member.vala_id, member.role);
    assert(updated.assigned_to === member.vala_id, "assignment not persisted");
  });

  await check("leads · bulk status update", async () => {
    const others = createdLeadIds.filter((id) => id !== leadId);
    await bulkUpdateStatus(others, "contacted");
    const refreshed = await Promise.all(others.map(fetchLead));
    assert(refreshed.every((l) => l?.status === "contacted"), "bulk status not applied");
  });

  /* --------------------------- notes / activity -------------------------- */
  await check("notes", async () => {
    await addNote(leadId, "Discovery call complete — needs 14-store rollout by Q3.");
    const notes = await fetchNotes(leadId);
    assert(notes.length > 0, "note not returned");
  });

  await check("activity timeline", async () => {
    await logActivity(leadId, "Demo scheduled", "Product demo booked for Tuesday 11:00 IST", "call");
    const activities = await fetchActivities(leadId);
    assert(activities.some((a) => a.action === "Demo scheduled"), "activity not recorded");
  });

  /* ------------------------------ follow-ups ----------------------------- */
  await check("follow-ups · schedule / update / delete", async () => {
    const followup = await createFollowup({
      lead_id: leadId,
      title: "Send rollout pricing sheet",
      channel: "email",
      scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
      assigned_to: "vala(manager)1001",
      notes: "Include multi-store discount tiers.",
    });
    const updated = await updateFollowup(followup.id, { status: "completed" });
    assert(updated.status === "completed", "follow-up status not updated");
    const list = await fetchFollowups(leadId);
    assert(list.some((f) => f.id === followup.id), "follow-up missing from list");
    await deleteFollowup(followup.id);
    const after = await fetchFollowups(leadId);
    assert(!after.some((f) => f.id === followup.id), "follow-up not deleted");
  });

  await check("follow-up automation rules", async () => {
    const rules = await fetchFollowupRules();
    assert(rules.length > 0, "no follow-up rules seeded");
    const rule = rules[0]!;
    await toggleFollowupRule(rule.id, !rule.active);
    await toggleFollowupRule(rule.id, rule.active);
  });

  /* ------------------------------ escalations ---------------------------- */
  await check("escalations", async () => {
    const esc = await createEscalation({
      lead_id: leadId,
      reason: "No response 48h after quote — enterprise deal at risk",
      level: 2,
      assigned_to: "vala(manager)1001",
      sla_minutes: 120,
    });
    const resolved = await resolveEscalation(esc.id, "Manager called client; demo rebooked.");
    assert(resolved.status === "resolved", "escalation not resolved");
    const all = await fetchEscalations();
    assert(all.some((e) => e.id === esc.id), "escalation missing from list");
  });

  /* -------------------------------- buzzer ------------------------------- */
  await check("buzzer alerts", async () => {
    await createAlert({
      lead_id: leadId,
      title: "Hot lead idle",
      message: "Northbridge Retail Group has had no contact for 12 hours.",
      severity: "high",
    });
    const alerts = await fetchBuzzerAlerts();
    const mine = alerts.find((a) => a.lead_id === leadId);
    assert(mine, "buzzer alert not created");
    await acknowledgeAlert(mine.id);
    const after = await fetchBuzzerAlerts();
    assert(after.find((a) => a.id === mine.id)?.acknowledged, "alert not acknowledged");
  });

  /* ----------------------------- notifications --------------------------- */
  await check("notifications", async () => {
    const notifications = await fetchNotifications();
    assert(notifications.length > 0, "no notifications produced");
    await markAllNotificationsRead();
  });

  /* --------------------- qualification / AI scoring ---------------------- */
  await check("qualification rules", async () => {
    await createQualificationRule({
      name: `Enterprise budget signal ${RUN_TAG}`,
      criteria: "Budget range above ₹4L and company size over 100 employees",
      weight: 25,
      auto_action: "Mark as hot and notify regional manager",
    });
    const rules = await fetchQualificationRules();
    const created = rules.find((r) => r.name.includes(RUN_TAG));
    assert(created, "qualification rule not created");
    await toggleQualificationRule(created.id, false);
    await toggleQualificationRule(created.id, true);
  });

  await check("scoring factors", async () => {
    const factors = await fetchScoringFactors();
    assert(factors.length > 0, "no scoring factors seeded");
    const factor = factors[0]!;
    await updateScoringFactor(factor.id, Math.min(100, factor.weight));
  });

  /* ------------------------------ behaviour ------------------------------ */
  await check("behaviour events", async () => {
    const { error } = await supabase.from("lead_behavior_events").insert({
      lead_id: leadId,
      event_type: "pricing_page_view",
      page: "/pricing/retail-pos",
      device: "desktop",
      duration_seconds: 212,
    });
    assert(!error, error?.message ?? "");
    const events = await fetchBehaviorEvents(leadId);
    assert(events.some((e) => e.event_type === "pricing_page_view"), "behaviour event missing");
  });

  /* ------------------------------ compliance ----------------------------- */
  await check("compliance policies", async () => {
    const policies = await fetchCompliancePolicies();
    assert(policies.length > 0, "no compliance policies seeded");
    await updatePolicyStatus(policies[0]!.id, policies[0]!.status);
  });

  await check("consent + do-not-contact", async () => {
    const { error } = await supabase.from("lead_consents").insert({
      lead_id: leadId,
      channel: "email",
      granted: true,
      captured_via: "website_form",
    });
    assert(!error, error?.message ?? "");
    const consents = await fetchConsents(leadId);
    assert(consents.length > 0, "consent record missing");
    await setDoNotContact(leadId, true);
    const blocked = await supabase
      .from("lead_consents")
      .insert({ lead_id: leadId, channel: "sms", granted: true, captured_via: "website_form" });
    assert(blocked.error, "guardrail did not block consent for do-not-contact lead");
    await setDoNotContact(leadId, false);
  });

  /* ------------------------- reference collections ----------------------- */
  await check("territories", async () => {
    const territories = await fetchTerritories();
    assert(territories.length > 0, "no territories seeded");
  });

  await check("lead sources", async () => {
    const sources = await fetchSources();
    assert(sources.length > 0, "no lead sources seeded");
    const source = sources[0]!;
    const updated = await updateSource(source.id, { active: source.active });
    assert(updated.id === source.id, "source update failed");
  });

  await check("team directory", async () => {
    const team = await fetchTeam();
    assert(team.length > 0, "no team members seeded");
  });

  await check("audit trail", async () => {
    const logs = await fetchAuditLogs(20);
    assert(logs.length > 0, "audit trail empty");
  });

  /* ---------------------------- API guardrails --------------------------- */
  await check("guardrail · audit trail is append-only", async () => {
    const logs = await fetchAuditLogs(1);
    const del = await supabase.from("audit_logs").delete().eq("id", logs[0]!.id);
    const upd = await supabase.from("audit_logs").update({ actor: "tampered" }).eq("id", logs[0]!.id);
    assert(del.error, "audit log delete was allowed");
    assert(upd.error, "audit log update was allowed");
  });

  await check("guardrail · behaviour events are append-only", async () => {
    const res = await supabase.from("lead_behavior_events").delete().eq("lead_id", leadId);
    assert(res.error, "behaviour event delete was allowed");
  });

  await check("guardrail · configuration tables are non-deletable", async () => {
    const res = await supabase.from("team_members").delete().neq("vala_id", "");
    assert(res.error, "team member delete was allowed");
  });

  await check("guardrail · invalid lead payloads rejected", async () => {
    const badEmail = await supabase.from("leads").insert(seedLead({ email: "not-an-email" }));
    assert(badEmail.error, "invalid email accepted");
    const badScore = await supabase.from("leads").insert(seedLead({ ai_score: 900 }));
    assert(badScore.error, "out-of-range score accepted");
    const badValue = await supabase.from("leads").insert(seedLead({ expected_value: -1 }));
    assert(badValue.error, "negative expected value accepted");
  });

  /* -------------------------------- cleanup ------------------------------ */
  await check("cleanup", async () => {
    for (const id of createdLeadIds) await deleteLead(id);
    const remaining = await fetchLeads({ search: RUN_TAG });
    assert(remaining.length === 0, "parity leads left behind");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
