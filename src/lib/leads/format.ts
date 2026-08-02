/** Presentation helpers shared by every Lead Manager screen. */

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "xxxx";
  return `xxxxx${digits.slice(-2)}`;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [user, domain] = email.split("@");
  if (!user || !domain) return "—";
  return `${user.slice(0, 1)}****@${domain}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  const future = diff < 0;
  const seconds = Math.floor(Math.abs(diff) / 1000);
  const format = (n: number, unit: string) =>
    future ? `in ${n} ${unit}${n === 1 ? "" : "s"}` : `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  if (seconds < 60) return future ? `in ${seconds} sec` : `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return format(minutes, "min");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return format(hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return format(days, "day");
  const months = Math.floor(days / 30);
  if (months < 12) return format(months, "month");
  return format(Math.floor(months / 12), "year");
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

export function formatCompact(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    value ?? 0,
  );
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function scoreTone(score: number): string {
  if (score >= 85) return "text-hot";
  if (score >= 65) return "text-warning";
  if (score >= 45) return "text-info";
  return "text-muted-foreground";
}

export function severityTone(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-destructive";
    case "high":
      return "text-hot";
    case "medium":
      return "text-warning";
    default:
      return "text-info";
  }
}
