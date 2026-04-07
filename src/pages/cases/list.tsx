import { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CaseRecord = {
  id: number;
  caseCode: string;
  status: string;
  customerComplaint: string;
  priority?: string | null;
  maintenanceTeam?: string | null;
  technicianName?: string | null;
  serialNumber?: string | null;
  createdAt?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deviceApplianceType?: string | null;
  deviceBrand?: string | null;
  deviceModelName?: string | null;
};

type WorkflowColumn = {
  key: string;
  label: string;
  statuses: string[];
};

const WORKFLOW_COLUMNS: WorkflowColumn[] = [
  {
    key: "received",
    label: "حالة جديدة",
    statuses: ["received", "new"],
  },
  {
    key: "waiting",
    label: "بانتظار",
    statuses: ["waiting", "pending", "waiting_approval"],
  },
  {
    key: "diagnosing",
    label: "قيد التشخيص",
    statuses: ["diagnosing", "under_diagnosis", "under diagnosis"],
  },
  {
    key: "in_progress",
    label: "قيد التنفيذ",
    statuses: ["in_progress", "in progress"],
  },
  {
    key: "repaired",
    label: "تم الإصلاح",
    statuses: ["repaired", "completed", "delivered"],
  },
  {
    key: "not_repairable",
    label: "لا يمكن إصلاحها",
    statuses: ["not_repairable", "not repairable"],
  },
];

const normalizeStatus = (status: string) => status.trim().toLowerCase();

const getDeviceName = (caseItem: CaseRecord) =>
  [
    caseItem.deviceBrand,
    caseItem.deviceApplianceType,
    caseItem.deviceModelName,
  ]
    .filter(Boolean)
    .join(" ") || "-";

export function CasesPage() {
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);
  const { result, query } = useList<CaseRecord>({
    resource: "cases",
  });

  const cases = result.data ?? [];
  const groupedCases = useMemo(() => {
    return WORKFLOW_COLUMNS.map((column) => ({
      ...column,
      cases: cases.filter((caseItem) =>
        column.statuses.includes(normalizeStatus(caseItem.status))
      ),
    }));
  }, [cases]);

  const toggleColumn = (key: string) => {
    setCollapsedColumns((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Cases</h1>
          <p className="text-muted-foreground">
            Track each case across the maintenance workflow.
          </p>
        </div>
        <Button size="lg" className="w-full sm:w-auto" asChild>
          <Link to="/cases/create">
            <Plus />
            إنشاء حالة جديدة
          </Link>
        </Button>
      </div>

      {query.isLoading && (
        <p className="text-muted-foreground">Loading cases...</p>
      )}
      {query.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {query.error.message}
        </p>
      )}
      {!query.isLoading && !query.error && (
        <Card className="overflow-hidden rounded-lg border bg-card/95">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle className="text-xl">Workflow board</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Board lanes follow the Arabic workflow from right to left.
                </p>
              </div>
              <Badge variant="outline" className="w-fit">
                {cases.length} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="flex min-h-[560px] min-w-max flex-row-reverse gap-4 p-4 md:p-5">
                {groupedCases.map((column) => (
                  <WorkflowLane
                    key={column.key}
                    label={column.label}
                    cases={column.cases}
                    isCollapsed={collapsedColumns.includes(column.key)}
                    onToggle={() => toggleColumn(column.key)}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function WorkflowLane({
  label,
  cases,
  isCollapsed,
  onToggle,
}: {
  label: string;
  cases: CaseRecord[];
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <section
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-lg border bg-muted/20 shadow-sm transition-[width,background-color,border-color] duration-300",
        isCollapsed
          ? "w-16 border-dashed bg-muted/35"
          : "w-[300px] border-border bg-background"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 border-b p-3",
          isCollapsed ? "justify-center" : "justify-between"
        )}
        dir="rtl"
      >
        {!isCollapsed && (
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{label}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {cases.length} حالة
            </p>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={isCollapsed ? `توسيع ${label}` : `تصغير ${label}`}
          className="rounded-full"
        >
          {isCollapsed ? <ChevronLeft /> : <ChevronRight />}
        </Button>
      </div>

      {isCollapsed ? (
        <div className="flex flex-1 flex-col items-center gap-4 px-2 py-4">
          <Badge variant="secondary" className="rounded-full">
            {cases.length}
          </Badge>
          <span
            className="text-sm font-semibold text-foreground [text-orientation:mixed] [writing-mode:vertical-rl]"
            dir="rtl"
          >
            {label}
          </span>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 p-3">
          {cases.length === 0 ? (
            <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
              لا توجد حالات
            </div>
          ) : (
            cases.map((caseItem) => (
              <CaseCard key={caseItem.id} caseItem={caseItem} />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function CaseCard({ caseItem }: { caseItem: CaseRecord }) {
  return (
    <article className="rounded-lg border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">{caseItem.caseCode}</p>
          <h3 className="mt-1 truncate font-semibold" dir="rtl">
            {caseItem.customerName ?? "عميل غير محدد"}
          </h3>
        </div>
        <Badge variant="secondary">{caseItem.priority ?? "متوسطة"}</Badge>
      </div>

      <div className="mt-3 space-y-2 text-sm text-muted-foreground" dir="rtl">
        <p>
          <span className="font-medium text-foreground">الجهاز: </span>
          {getDeviceName(caseItem)}
        </p>
        <p className="line-clamp-2">
          <span className="font-medium text-foreground">المشكلة: </span>
          {caseItem.customerComplaint}
        </p>
        <p>
          <span className="font-medium text-foreground">الفني: </span>
          {caseItem.technicianName || "غير معين"}
        </p>
      </div>
    </article>
  );
}
