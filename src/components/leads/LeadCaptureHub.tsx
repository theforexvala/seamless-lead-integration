import { useState } from "react";
import { X } from "lucide-react";
import { useLeadMutations, useSources, useTeam, useTerritories } from "@/lib/leads/hooks";
import type { LeadPriority } from "@/lib/leads/types";
import { LEAD_PRIORITIES } from "@/lib/leads/types";

const EMPTY = {
  full_name: "",
  email: "",
  phone: "",
  company: "",
  software_interest: "",
  source: "",
  region: "",
  city: "",
  country: "",
  budget_range: "",
  expected_value: "",
  priority: "warm" as LeadPriority,
  assigned_to: "",
  assigned_role: "",
  consent_given: false,
  consent_channel: "",
  notes: "",
};

/** Multi-channel capture hub — writes a real lead row through the API layer. */
export function LeadCaptureHub({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ ...EMPTY });
  const { data: sources = [] } = useSources();
  const { data: territories = [] } = useTerritories();
  const { data: team = [] } = useTeam();
  const { createLead, addNote } = useLeadMutations();

  if (!open) return null;

  const set = (key: keyof typeof EMPTY, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const regions = Array.from(new Set(territories.map((t) => t.country))).sort();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const member = team.find((t) => t.vala_id === form.assigned_to);
    const lead = await createLead.mutateAsync({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      software_interest: form.software_interest.trim(),
      source: form.source,
      region: form.region,
      city: form.city.trim() || null,
      country: form.country.trim() || form.region,
      budget_range: form.budget_range.trim() || null,
      expected_value: form.expected_value ? Number(form.expected_value) : 0,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      assigned_role: member?.role ?? null,
      consent_given: form.consent_given,
      consent_channel: form.consent_channel || null,
      last_action: "Form submitted",
    });
    if (form.notes.trim()) await addNote.mutateAsync({ leadId: lead.id, body: form.notes.trim() });
    setForm({ ...EMPTY });
    onClose();
  };

  const field =
    "focus-ring h-9 w-full rounded-lg border border-border bg-secondary/60 px-3 text-sm text-foreground placeholder:text-muted-foreground";
  const label = "text-[11px] font-medium uppercase tracking-wider text-muted-foreground";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="glass-panel my-8 w-full max-w-3xl overflow-hidden"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
              Capture Hub
            </p>
            <h3 className="text-lg font-semibold text-foreground">Add a new lead</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className={label}>Full name</label>
            <input required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className={field} placeholder="Ahmed Hassan" />
          </div>
          <div>
            <label className={label}>Email</label>
            <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={field} placeholder="name@company.com" />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={field} placeholder="+234…" />
          </div>
          <div>
            <label className={label}>Company</label>
            <input value={form.company} onChange={(e) => set("company", e.target.value)} className={field} placeholder="TechCorp" />
          </div>
          <div>
            <label className={label}>Software interest</label>
            <input required value={form.software_interest} onChange={(e) => set("software_interest", e.target.value)} className={field} placeholder="POS System" />
          </div>
          <div>
            <label className={label}>Source</label>
            <select required value={form.source} onChange={(e) => set("source", e.target.value)} className={field}>
              <option value="">Select source</option>
              {sources.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Region</label>
            <select required value={form.region} onChange={(e) => set("region", e.target.value)} className={field}>
              <option value="">Select region</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>City</label>
            <input value={form.city} onChange={(e) => set("city", e.target.value)} className={field} placeholder="Lagos" />
          </div>
          <div>
            <label className={label}>Budget range</label>
            <input value={form.budget_range} onChange={(e) => set("budget_range", e.target.value)} className={field} placeholder="$2,000 – $5,000" />
          </div>
          <div>
            <label className={label}>Expected value (USD)</label>
            <input type="number" min="0" value={form.expected_value} onChange={(e) => set("expected_value", e.target.value)} className={field} placeholder="4500" />
          </div>
          <div>
            <label className={label}>Priority</label>
            <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={field}>
              {LEAD_PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Assign to</label>
            <select value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)} className={field}>
              <option value="">Leave unassigned (auto-route)</option>
              {team.filter((t) => t.active).map((t) => (
                <option key={t.id} value={t.vala_id}>
                  {t.full_name} — {t.role} ({t.region})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Requirement notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className="focus-ring w-full rounded-lg border border-border bg-secondary/60 p-3 text-sm text-foreground placeholder:text-muted-foreground" placeholder="Multi-branch setup, 500+ users…" />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <input id="consent" type="checkbox" checked={form.consent_given} onChange={(e) => set("consent_given", e.target.checked)} className="h-4 w-4 rounded border-border" />
            <label htmlFor="consent" className="text-xs text-muted-foreground">
              Marketing consent captured
            </label>
            <input value={form.consent_channel} onChange={(e) => set("consent_channel", e.target.value)} className={`${field} max-w-48`} placeholder="Consent channel (web form)" />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createLead.isPending}
            className="rounded-lg gradient-command px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {createLead.isPending ? "Capturing…" : "Capture lead"}
          </button>
        </footer>
      </form>
    </div>
  );
}
