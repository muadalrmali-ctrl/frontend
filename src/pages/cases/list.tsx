import { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
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
  serialNumber?: string | null;
  createdAt?: string | null;
  deviceApplianceType?: string | null;
  deviceBrand?: string | null;
  deviceModelName?: string | null;
};

type WorkflowColumn = {
  label: string;
  statuses: string[];
};

const WORKFLOW_COLUMNS: WorkflowColumn[] = [
  {
    label: "حالة جديدة",
    statuses: ["received", "new"],
  },
  {
    label: "بانتظار",
    statuses: ["waiting", "pending", "waiting_approval"],
  },
  {
    label: "قيد التشخيص",
    statuses: ["diagnosing", "under_diagnosis", "under diagnosis"],
  },
  {
    label: "قيد التنفيذ",
    statuses: ["in_progress", "in progress"],
  },
  {
    label: "تم الإصلاح",
    statuses: ["repaired", "completed", "delivered"],
  },
  {
    label: "لا يمكن إصلاحها",
    statuses: ["not_repairable", "not repairable"],
  },
];

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-US").format(new Date(value)) : "-";

const getDeviceName = (caseItem: CaseRecord) =>
  [
    caseItem.deviceBrand,
    caseItem.deviceApplianceType,
    caseItem.deviceModelName,
  ]
    .filter(Boolean)
    .join(" ") || "-";

const normalizeStatus = (status: string) => status.trim().toLowerCase();

export function CasesPage() {
  const [isBoardExpanded, setIsBoardExpanded] = useState(true);
  const { result, query } = useList<CaseRecord>({
    resource: "cases",
  });

  const cases = result.data ?? [];
  const visibleCardLimit = isBoardExpanded ? Number.POSITIVE_INFINITY : 1;

  const groupedCases = useMemo(() => {
    return WORKFLOW_COLUMNS.map((column) => ({
      ...column,
      cases: cases.filter((caseItem) =>
        column.statuses.includes(normalizeStatus(caseItem.status))
      ),
    }));
  }, [cases]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Cases</h1>
          <p className="text-muted-foreground">
            Track each case across the maintenance workflow.
          </p>
        </div>
        <Button size="lg" className="w-full sm:w-auto" type="button">
          <Plus />
          إنشاء حالة جديدة
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
        <Card className="overflow-hidden rounded-lg">
          <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">Workflow board</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Six status lanes for the case repair journey.
              </p>
            </div>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsBoardExpanded((current) => !current)}
              className="w-full sm:w-auto"
              aria-expanded={isBoardExpanded}
            >
              {isBoardExpanded ? <ChevronUp /> : <ChevronDown />}
              {isBoardExpanded ? "تصغير اللوحة" : "توسيع اللوحة"}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div
              className={cn(
                "overflow-x-auto transition-all duration-300 ease-in-out",
                isBoardExpanded ? "max-h-[760px]" : "max-h-[250px]"
              )}
            >
              <div
                className={cn(
                  "grid min-w-[1120px] grid-cols-6 gap-3 p-4 transition-all duration-300",
                  isBoardExpanded ? "md:p-5" : "md:p-4"
                )}
              >
                {groupedCases.map((column) => (
                  <WorkflowColumn
                    key={column.label}
                    label={column.label}
                    cases={column.cases}
                    visibleCardLimit={visibleCardLimit}
                    isBoardExpanded={isBoardExpanded}
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

function WorkflowColumn({
  label,
  cases,
  visibleCardLimit,
  isBoardExpanded,
}: {
  label: string;
  cases: CaseRecord[];
  visibleCardLimit: number;
  isBoardExpanded: boolean;
}) {
  const visibleCases = cases.slice(0, visibleCardLimit);
  const hiddenCount = cases.length - visibleCases.length;

  return (
    <section
      className={cn(
        "flex min-h-[190px] flex-col rounded-lg border bg-muted/25 transition-all duration-300",
        isBoardExpanded ? "min-h-[520px]" : "min-h-[190px]"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-3">
        <h2 className="text-right text-sm font-semibold leading-6" dir="rtl">
          {label}
        </h2>
        <Badge variant="secondary">{cases.length}</Badge>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        {visibleCases.length === 0 ? (
          <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed bg-background/60 px-3 text-center text-sm text-muted-foreground">
            لا توجد حالات
          </div>
        ) : (
          visibleCases.map((caseItem) => (
            <CaseCard key={caseItem.id} caseItem={caseItem} />
          ))
        )}
        {hiddenCount > 0 && (
          <div className="rounded-lg border bg-background/80 px-3 py-2 text-center text-sm text-muted-foreground">
            +{hiddenCount} حالات أخرى
          </div>
        )}
      </div>
    </section>
  );
}

function CaseCard({ caseItem }: { caseItem: CaseRecord }) {
  return (
    <article className="rounded-lg border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{caseItem.caseCode}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {getDeviceName(caseItem)}
          </p>
        </div>
        <Badge variant="outline">{formatDate(caseItem.createdAt)}</Badge>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
        {caseItem.customerComplaint || "No complaint recorded."}
      </p>
      {caseItem.serialNumber && (
        <p className="mt-3 text-xs text-muted-foreground">
          Serial: {caseItem.serialNumber}
        </p>
      )}
    </article>
  );
}
