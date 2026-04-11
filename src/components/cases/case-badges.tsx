import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const normalizeArabicText = (value: string) => value.trim().toLowerCase();

const priorityBadgeStyles: Record<string, string> = {
  urgent:
    "border-transparent bg-red-50 text-red-600",
  "عاجلة":
    "border-transparent bg-red-50 text-red-600",
  high:
    "border-transparent bg-orange-50 text-orange-600",
  "مرتفعة":
    "border-transparent bg-orange-50 text-orange-600",
  medium:
    "border-transparent bg-[rgba(65,92,179,0.12)] text-[#415CB3]",
  "متوسطة":
    "border-transparent bg-[rgba(65,92,179,0.12)] text-[#415CB3]",
  low:
    "border-transparent bg-emerald-50 text-emerald-600",
  "منخفضة":
    "border-transparent bg-emerald-50 text-emerald-600",
};

const caseTypeBadgeStyles: Record<string, string> = {
  internal:
    "border-transparent bg-emerald-50 text-emerald-700",
  external:
    "border-transparent bg-[rgba(65,92,179,0.12)] text-[#415CB3]",
};

const caseStatusBadgeStyles: Record<string, string> = {
  received:
    "border-transparent bg-slate-100 text-slate-700",
  waiting_part:
    "border-transparent bg-amber-50 text-amber-700",
  diagnosing:
    "border-transparent bg-violet-50 text-violet-700",
  waiting_approval:
    "border-transparent bg-orange-50 text-orange-700",
  in_progress:
    "border-transparent bg-sky-50 text-sky-700",
  repaired:
    "border-transparent bg-emerald-50 text-emerald-700",
  not_repairable:
    "border-transparent bg-red-50 text-red-600",
};

export const getCaseTypeLabel = (caseType?: string | null) =>
  caseType === "external" ? "خارجي" : "داخلي";

export function CasePriorityBadge({
  priority,
  className,
}: {
  priority?: string | null;
  className?: string;
}) {
  const value = (priority || "متوسطة").trim();
  const tone =
    priorityBadgeStyles[value] ||
    priorityBadgeStyles[normalizeArabicText(value)] ||
    priorityBadgeStyles["متوسطة"];

  return (
    <Badge
      className={cn("rounded-full px-3 py-1 text-[11px] font-bold", tone, className)}
    >
      {value}
    </Badge>
  );
}

export function CaseTypeBadge({
  caseType,
  className,
}: {
  caseType?: string | null;
  className?: string;
}) {
  const normalized = caseType === "external" ? "external" : "internal";
  return (
    <Badge
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-bold",
        caseTypeBadgeStyles[normalized],
        className
      )}
    >
      {getCaseTypeLabel(caseType)}
    </Badge>
  );
}

export function CaseStatusBadge({
  status,
  label,
  className,
}: {
  status?: string | null;
  label: string;
  className?: string;
}) {
  const normalized = normalizeArabicText(status || "");
  const tone =
    caseStatusBadgeStyles[normalized] ||
    caseStatusBadgeStyles.received;

  return (
    <Badge
      className={cn("rounded-full px-3 py-1 text-sm font-bold", tone, className)}
    >
      {label}
    </Badge>
  );
}
