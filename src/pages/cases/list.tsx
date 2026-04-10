import { DragEvent, useMemo, useState } from "react";
import { useList, useUpdate } from "@refinedev/core";
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
  technicianName?: string | null;
  customerName?: string | null;
  deviceApplianceType?: string | null;
  deviceBrand?: string | null;
  deviceModelName?: string | null;
};

type WorkflowColumn = {
  key: string;
  label: string;
  statuses: string[];
  targetStatus: string;
};

const WORKFLOW_COLUMNS: WorkflowColumn[] = [
  {
    key: "received",
    label: "حالة جديدة",
    statuses: ["received", "new"],
    targetStatus: "received",
  },
  {
    key: "waiting_part",
    label: "بانتظار القطعة",
    statuses: ["waiting_part", "waiting_parts", "waiting", "pending"],
    targetStatus: "waiting_part",
  },
  {
    key: "diagnosing",
    label: "قيد التشخيص",
    statuses: ["diagnosing", "under_diagnosis", "under diagnosis"],
    targetStatus: "diagnosing",
  },
  {
    key: "waiting_approval",
    label: "بانتظار الموافقة",
    statuses: ["waiting_approval"],
    targetStatus: "waiting_approval",
  },
  {
    key: "in_progress",
    label: "قيد التنفيذ",
    statuses: ["in_progress", "in progress"],
    targetStatus: "in_progress",
  },
  {
    key: "repaired",
    label: "تم الإصلاح",
    statuses: ["repaired", "completed", "delivered"],
    targetStatus: "repaired",
  },
  {
    key: "not_repairable",
    label: "لا يمكن إصلاحها",
    statuses: ["not_repairable", "not repairable"],
    targetStatus: "not_repairable",
  },
];

const waitingApprovalColumn = WORKFLOW_COLUMNS.find((column) => column.key === "waiting_approval");
if (waitingApprovalColumn) {
  waitingApprovalColumn.label = "بانتظار موافقة وتسجيل استلام قطعة غيار";
}

const ALLOWED_BOARD_TRANSITIONS: Record<string, string[]> = {
  received: ["waiting_part", "diagnosing", "not_repairable"],
  waiting_part: ["received", "diagnosing", "not_repairable"],
  diagnosing: ["waiting_part", "waiting_approval", "not_repairable"],
  waiting_approval: ["diagnosing", "not_repairable"],
  in_progress: ["repaired", "not_repairable"],
  repaired: [],
  not_repairable: ["diagnosing", "waiting_part"],
};

const normalizeStatus = (status: string) => status.trim().toLowerCase();

const getWorkflowStatus = (status: string) => {
  const normalizedStatus = normalizeStatus(status);
  return (
    WORKFLOW_COLUMNS.find((column) =>
      column.statuses.includes(normalizedStatus)
    )?.targetStatus ?? normalizedStatus
  );
};

const getDeviceName = (caseItem: CaseRecord) =>
  [caseItem.deviceBrand, caseItem.deviceApplianceType, caseItem.deviceModelName]
    .filter(Boolean)
    .join(" ") || "-";

export function CasesPage() {
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);
  const [draggedCase, setDraggedCase] = useState<CaseRecord | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const { mutateAsync: updateStatus, mutation } = useUpdate();
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

  const moveCase = async (caseItem: CaseRecord, toStatus: string) => {
    const fromStatus = getWorkflowStatus(caseItem.status);
    setTransitionError(null);

    if (fromStatus === toStatus) return;

    if (!ALLOWED_BOARD_TRANSITIONS[fromStatus]?.includes(toStatus)) {
      setTransitionError("هذه الحركة غير مسموحة في سير العمل.");
      return;
    }

    try {
      await updateStatus({
        resource: "case-status",
        id: caseItem.id,
        values: { toStatus },
      });
      await query.refetch();
    } catch (error) {
      setTransitionError(
        error instanceof Error ? error.message : "تعذر تغيير حالة الحالة"
      );
    }
  };

  const handleDrop = async (
    event: DragEvent<HTMLElement>,
    column: WorkflowColumn
  ) => {
    event.preventDefault();
    if (!draggedCase || mutation.isPending) return;
    await moveCase(draggedCase, column.targetStatus);
    setDraggedCase(null);
  };

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">الحالات</h1>
          <p className="text-muted-foreground">
            تابع كل حالة عبر مراحل الصيانة واسحب البطاقات بين الأعمدة المسموحة.
          </p>
        </div>
        <Button size="lg" className="w-full sm:w-auto" asChild>
          <Link to="/cases/create">
            <Plus />
            إنشاء حالة جديدة
          </Link>
        </Button>
      </div>

      {transitionError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {transitionError}
        </p>
      )}
      {query.isLoading && (
        <p className="text-muted-foreground">جاري تحميل الحالات...</p>
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
                <CardTitle className="text-xl">لوحة سير العمل</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  الحركات الخلفية من قيد التنفيذ إلى المراحل السابقة غير مسموحة.
                </p>
              </div>
              <Badge variant="outline" className="w-fit">
                {cases.length} حالة
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="flex min-h-[560px] min-w-max flex-row gap-4 p-4 md:p-5">
                {groupedCases.map((column) => (
                  <WorkflowLane
                    key={column.key}
                    column={column}
                    isCollapsed={collapsedColumns.includes(column.key)}
                    draggedCase={draggedCase}
                    onToggle={() => toggleColumn(column.key)}
                    onDragStart={(caseItem) => setDraggedCase(caseItem)}
                    onDragEnd={() => setDraggedCase(null)}
                    onDrop={(event) => handleDrop(event, column)}
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
  column,
  draggedCase,
  isCollapsed,
  onToggle,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  column: WorkflowColumn & { cases: CaseRecord[] };
  draggedCase: CaseRecord | null;
  isCollapsed: boolean;
  onToggle: () => void;
  onDragStart: (caseItem: CaseRecord) => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}) {
  const canDrop =
    draggedCase &&
    ALLOWED_BOARD_TRANSITIONS[getWorkflowStatus(draggedCase.status)]?.includes(
      column.targetStatus
    );

  return (
    <section
      onDragOver={(event) => {
        if (canDrop) event.preventDefault();
      }}
      onDrop={onDrop}
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-lg border bg-muted/20 shadow-sm transition-[width,background-color,border-color] duration-300",
        isCollapsed
          ? "w-16 border-dashed bg-muted/35"
          : "w-[300px] border-border bg-background",
        canDrop && "border-primary bg-primary/5"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 border-b p-3",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!isCollapsed && (
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{column.label}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {column.cases.length} حالة
            </p>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={isCollapsed ? `توسيع ${column.label}` : `تصغير ${column.label}`}
          className="rounded-full"
        >
          {isCollapsed ? <ChevronLeft /> : <ChevronRight />}
        </Button>
      </div>

      {isCollapsed ? (
        <div className="flex flex-1 flex-col items-center gap-4 px-2 py-4">
          <Badge variant="secondary" className="rounded-full">
            {column.cases.length}
          </Badge>
          <span className="text-sm font-semibold text-foreground [text-orientation:mixed] [writing-mode:vertical-rl]">
            {column.label}
          </span>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 p-3">
          {column.cases.length === 0 ? (
            <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
              لا توجد حالات
            </div>
          ) : (
            column.cases.map((caseItem) => (
              <CaseCard
                key={caseItem.id}
                caseItem={caseItem}
                onDragStart={() => onDragStart(caseItem)}
                onDragEnd={onDragEnd}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function CaseCard({
  caseItem,
  onDragStart,
  onDragEnd,
}: {
  caseItem: CaseRecord;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <Link
      to={`/cases/${caseItem.id}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="block rounded-lg border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">{caseItem.caseCode}</p>
          <h3 className="mt-1 truncate font-semibold">
            {caseItem.customerName ?? "عميل غير محدد"}
          </h3>
        </div>
        <Badge variant="secondary">{caseItem.priority ?? "متوسطة"}</Badge>
      </div>

      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
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
    </Link>
  );
}
