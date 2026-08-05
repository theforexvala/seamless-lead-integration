import { useRef, useState } from "react";
import { CheckCircle2, Download, Globe, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLeadMutations, useLeads, useSources, useSourceMutations } from "@/lib/leads/hooks";
import type { LeadInsert, LeadPriority } from "@/lib/leads/types";
import { LEAD_PRIORITIES } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

const REQUIRED = ["full_name", "email", "software_interest", "source", "region"] as const;
const COLUMNS = [...REQUIRED, "phone", "company", "city", "country", "budget_range", "expected_value", "priority", "consent_given", "consent_channel"];

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function csvValue(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function BulkLeadImport({ onComplete }: { onComplete: () => void }) {
  const [imports, setImports] = useState<LeadInsert[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: sources = [] } = useSources();
  const { createLeads } = useLeadMutations();

  const readFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) { toast.error("Choose a CSV file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("CSV must be smaller than 10 MB"); return; }
    const rows = parseCsv(await file.text());
    if (rows.length < 2) { toast.error("The CSV has no lead rows"); return; }
    const headers = rows[0]?.map((header) => header.toLowerCase()) ?? [];
    const missing = REQUIRED.filter((column) => !headers.includes(column));
    if (missing.length) { toast.error(`Missing columns: ${missing.join(", ")}`); return; }
    const priorities = new Set<string>(LEAD_PRIORITIES);
    const parsed = rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]))).map((data) => ({
      full_name: data.full_name, email: data.email, software_interest: data.software_interest, source: data.source, region: data.region,
      phone: data.phone || null, company: data.company || null, city: data.city || null, country: data.country || data.region,
      budget_range: data.budget_range || null, expected_value: Number(data.expected_value) || 0,
      priority: (priorities.has(data.priority) ? data.priority : "warm") as LeadPriority,
      consent_given: ["true", "yes", "1"].includes(data.consent_given?.toLowerCase()),
      consent_channel: data.consent_channel || null, last_action: "CSV import",
    } satisfies LeadInsert));
    const incomplete = parsed.findIndex((lead) => !lead.full_name || !lead.email || !lead.software_interest || !lead.source || !lead.region);
    if (incomplete >= 0) { toast.error(`Row ${incomplete + 2} is missing a required value`); return; }
    setImports(parsed);
    toast.success(`${parsed.length} rows validated`);
  };

  const downloadTemplate = () => {
    const sample = ["Amina Yusuf", "amina@example.com", "POS System", sources[0]?.name ?? "Website", "Nigeria", "+2348000000000", "Amina Retail", "Lagos", "Nigeria", "$2,000-$5,000", "4500", "hot", "true", "web form"];
    const blob = new Blob([[COLUMNS.join(","), sample.map(csvValue).join(",")].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "software-vala-lead-import.csv"; anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="space-y-4 p-5">
    <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); }} />
    <button type="button" onClick={() => fileRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void readFile(file); }} className="focus-ring w-full rounded-lg border-2 border-dashed border-border p-10 text-center hover:border-primary/50">
      <Upload className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 text-sm font-medium text-foreground">Drop a CSV here or choose a file</p><p className="mt-1 text-xs text-muted-foreground">CSV only · maximum 10 MB</p>
    </button>
    <div className="rounded-lg border border-border bg-secondary/30 p-4"><p className="text-xs font-semibold text-foreground">Required columns</p><p className="mt-1 font-mono text-[11px] text-muted-foreground">{REQUIRED.join(", ")}</p></div>
    {imports.length ? <div className="rounded-lg border border-success/40 bg-success/10 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-success"><CheckCircle2 className="h-4 w-4" />{imports.length} rows validated</p><p className="mt-1 text-xs text-muted-foreground">First row: {imports[0]?.full_name} · {imports[0]?.email}</p></div> : null}
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={downloadTemplate}><Download />Download template</Button><Button type="button" disabled={!imports.length || createLeads.isPending} onClick={() => createLeads.mutate(imports, { onSuccess: onComplete })}><Upload />{createLeads.isPending ? "Importing…" : `Import ${imports.length || ""} leads`}</Button></div>
  </div>;
}

export function CaptureSources() {
  const { data: sources = [] } = useSources();
  const { data: leads = [] } = useLeads();
  const sourceMutations = useSourceMutations();
  return <div className="space-y-3 p-5">{sources.map((source) => {
    const count = leads.filter((lead) => lead.source === source.name).length;
    return <div key={source.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/30 p-4">
      <Globe className={cn("h-5 w-5", source.active ? "text-success" : "text-muted-foreground")} />
      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground">{source.name}</p><p className="truncate text-xs text-muted-foreground">{source.channel} · {count} leads · {source.webhook_url ?? "No webhook configured"}</p></div>
      <Button type="button" variant={source.active ? "outline" : "default"} size="sm" disabled={sourceMutations.update.isPending} onClick={() => sourceMutations.update.mutate({ id: source.id, patch: { active: !source.active } })}>{source.active ? "Pause" : "Activate"}</Button>
    </div>;
  })}</div>;
}