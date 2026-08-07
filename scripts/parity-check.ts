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

const SUPABASE_URL = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"] ?? "";
const SUPABASE_ANON_KEY =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
  process.env["VITE_SUPABASE_ANON_KEY"] ??
  process.env["SUPABASE_PUBLISHABLE_KEY"] ??
  "";

type RestResult = { status: number; body: { code?: string; message?: string } | null };

/** Raw anon REST call — lets negative tests assert real status codes and error bodies. */
async function rest(path: string, init: RequestInit = {}): Promise<RestResult> {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: RestResult["body"] = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }
  return { status: res.status, body };
}

function assertRejected(
  label: string,
  res: RestResult,
  statuses: number[],
  codes: string[],
): asserts res is RestResult & { body: { code: string; message: string } } {
  if (!statuses.includes(res.status)) {
    throw new Error(`${label}: expected status ${statuses.join("/")}, got ${res.status}`);
  }
  const code = res.body?.code ?? "";
  if (!codes.includes(code)) {
    throw new Error(`${label}: expected error code ${codes.join("/")}, got "${code}"`);
  }
  if (!res.body?.message) {
    throw new Error(`${label}: rejection had no error message body`);
  }
}


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

  /* ------------------- negative tests · disallowed anon ------------------- */
  await check("negative · privileged tables are not exposed to anon", async () => {
    for (const table of ["users", "profiles", "user_roles", "secrets"]) {
      const res = await rest(`/rest/v1/${table}?select=*&limit=1`);
      assertRejected(`select on public.${table}`, res, [404, 401, 403], [
        "PGRST205",
        "PGRST301",
        "42501",
      ]);
    }
  });

  await check("negative · non-public schemas are unreachable", async () => {
    const res = await rest("/rest/v1/users?select=*&limit=1", {
      headers: { "Accept-Profile": "auth" },
    });
    assertRejected("select on auth.users", res, [404, 406, 401, 403], [
      "PGRST106",
      "PGRST205",
      "PGRST301",
      "42501",
    ]);
  });

  await check("negative · append-only tables reject UPDATE/DELETE with 401/403", async () => {
    const logs = await fetchAuditLogs(1);
    const id = logs[0]!.id;
    for (const [label, init] of [
      ["delete audit_logs", { method: "DELETE" }],
      ["update audit_logs", { method: "PATCH", body: JSON.stringify({ actor: "tampered" }) }],
    ] as const) {
      const res = await rest(`/rest/v1/audit_logs?id=eq.${id}`, init);
      assertRejected(label, res, [401, 403], ["42501"]);
    }
    const behaviour = await rest(`/rest/v1/lead_behavior_events?lead_id=eq.${leadId}`, {
      method: "DELETE",
    });
    assertRejected("delete lead_behavior_events", behaviour, [401, 403], ["42501"]);
    const consent = await rest(`/rest/v1/lead_consents?lead_id=eq.${leadId}`, { method: "DELETE" });
    assertRejected("delete lead_consents", consent, [401, 403], ["42501"]);
    const activity = await rest(`/rest/v1/lead_activities?lead_id=eq.${leadId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "tampered" }),
    });
    assertRejected("update lead_activities", activity, [401, 403], ["42501"]);
  });

  await check("negative · configuration tables reject DELETE with 401/403", async () => {
    for (const table of [
      "team_members",
      "territories",
      "lead_sources",
      "followup_rules",
      "qualification_rules",
      "scoring_factors",
      "compliance_policies",
    ]) {
      const res = await rest(`/rest/v1/${table}?id=not.is.null`, { method: "DELETE" });
      assertRejected(`delete ${table}`, res, [401, 403], ["42501"]);
    }
  });

  await check("negative · referential integrity is enforced (409 / 23503)", async () => {
    const orphanNote = await rest("/rest/v1/lead_notes", {
      method: "POST",
      body: JSON.stringify({
        lead_id: "00000000-0000-0000-0000-000000000000",
        body: "orphan note",
      }),
    });
    assertRejected("orphan lead note", orphanNote, [409], ["23503"]);

    const badAssignee = await supabase
      .from("leads")
      .update({ assigned_to: "vala(ghost)9999" })
      .eq("id", leadId);
    assert(badAssignee.error?.code === "23503", "unknown assignee accepted");
  });

  await check("negative · duplicate lead email rejected (P0001)", async () => {
    const existing = await fetchLead(leadId);
    const dup = await supabase.from("leads").insert(seedLead({ email: existing!.email }));
    assert(dup.error?.code === "P0001", `duplicate email not rejected (${dup.error?.code})`);
    assert(/already exists/i.test(dup.error.message), "duplicate email message not descriptive");
  });

  await check("negative · payload guardrails return descriptive P0001 bodies", async () => {
    const cases: [string, Record<string, unknown>, RegExp][] = [
      ["email format", { email: "not-an-email" }, /valid address/i],
      ["score range", { ai_score: 900 }, /between 0 and 100/i],
      ["expected value", { expected_value: -1 }, /out of range/i],
      ["name length", { full_name: "A" }, /between 2 and 120/i],
      ["tag count", { tags: Array.from({ length: 21 }, (_, i) => `t${i}`) }, /at most 20 tags/i],
    ];
    for (const [label, overrides, pattern] of cases) {
      const res = await rest("/rest/v1/leads", {
        method: "POST",
        body: JSON.stringify(seedLead(overrides as Partial<LeadInsert>)),
      });
      assertRejected(label, res, [400], ["P0001"]);
      assert(pattern.test(res.body?.message ?? ""), `${label}: unexpected body ${res.body?.message}`);
    }
  });

  await check("negative · do-not-contact blocks consent capture", async () => {
    await setDoNotContact(leadId, true);
    const res = await rest("/rest/v1/lead_consents", {
      method: "POST",
      body: JSON.stringify({ lead_id: leadId, channel: "sms", granted: true }),
    });
    assertRejected("consent for DNC lead", res, [400], ["P0001"]);
    assert(/do-not-contact/i.test(res.body?.message ?? ""), "DNC message not descriptive");
    await setDoNotContact(leadId, false);
  });

  await check("negative · anon cannot call privileged RPCs", async () => {
    for (const fn of ["validate_lead", "set_updated_at", "sync_lead_consent"]) {
      const res = await rest(`/rest/v1/rpc/${fn}`, { method: "POST", body: "{}" });
      assertRejected(`rpc ${fn}`, res, [404, 401, 403], ["PGRST202", "PGRST302", "42501"]);
    }
  });

  await check("negative · requests without an API key are rejected (401)", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=id&limit=1`);
    const body = await res.json().catch(() => null);
    assert(res.status === 401, `missing apikey returned ${res.status}`);
    assert(body, "missing apikey returned no error body");
  });


  /* -------------------------------- cleanup ------------------------------ */
  await check("cleanup", async () => {
    for (const id of createdLeadIds) await deleteLead(id);
    // Configuration rows are non-deletable by design; deactivate the probe rule instead.
    const rules = await fetchQualificationRules();
    const probe = rules.find((r) => r.name.includes(RUN_TAG));
    if (probe) await toggleQualificationRule(probe.id, false);
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
