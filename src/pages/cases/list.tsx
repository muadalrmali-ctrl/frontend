import { DragEvent, useMemo, useState } from "react";
import { useList, useUpdate } from "@refinedev/core";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router";
import {
  CasePriorityBadge,
  CaseTypeBadge,
} from "@/components/cases/case-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CASE_COLUMN_PERMISSION_MAP, hasPermission } from "@/lib/access-control";
import { cn } from "@/lib/utils";
import { getStoredUser } from "@/providers/auth-provider";

type CaseRecord = {
  id: number;
  caseCode: string;
  caseType?: string | null;
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
    label: "بانتظار موافقة وتسجيل استلام قطعة غيار",
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

const ALLOWED_BOARD_TRANSITIONS: Record<string, string[]> = {
  received: ["waiting_part", "diagnosing", "not_repairable"],
  waiting_part: ["received", "diagnosing", "not_repairable"],
  diagnosing: ["waiting_part", "waiting_approval", "not_repairable"],
  waiting_approval: ["diagnosing", "not_repairable"],
  in_progress: ["repaired", "not_repairable"],
  repaired: [],
  not_repairable: ["diagnosing", "waiting_part"],
};

const STATUS_TRANSITION_PERMISSION_MAP: Record<string, string> = {
  received: "cases.diagnosis.edit",
  waiting_part: "cases.diagnosis.edit",
  diagnosing: "cases.diagnosis.edit",
  waiting_approval: "cases.diagnosis.edit",
  in_progress: "cases.approval.prepare_execution",
  repaired: "cases.in_progress.mark_repaired",
  not_repairable: "cases.diagnosis.edit",
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

const canMoveCaseFromStatus = (user: ReturnType<typeof getStoredUser>, status: string) => {
  const workflowStatus = getWorkflowStatus(status);
  const allowedTransitions = ALLOWED_BOARD_TRANSITIONS[workflowStatus] ?? [];
  return allowedTransitions.some((targetStatus) => {
    const permissionKey = STATUS_TRANSITION_PERMISSION_MAP[targetStatus];
    return !permissionKey || hasPermission(user, permissionKey);
  });
};

const getDeviceName = (caseItem: CaseRecord) =>
  [caseItem.deviceBrand, caseItem.deviceApplianceType, caseItem.deviceModelName]
    .filter(Boolean)
    .join(" ") || "-";

export function CasesPage() {
  const currentUser = getStoredUser();
  const canCreateCase = hasPermission(currentUser, "cases.create");
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);
  const [draggedCase, setDraggedCase] = useState<CaseRecord | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const { mutateAsync: updateStatus, mutation } = useUpdate();
  const { result, query } = useList<CaseRecord>({
    resource: "cases",
  });

  const cases = result.data ?? [];
  const groupedCases = useMemo(() => {
    return WORKFLOW_COLUMNS
      .filter((column) => hasPermission(currentUser, CASE_COLUMN_PERMISSION_MAP[column.targetStatus] ?? "cases.view"))
      .map((column) => ({
        ...column,
        cases: cases.filter((caseItem) =>
          column.statuses.includes(normalizeStatus(caseItem.status))
        ),
      }));
  }, [cases, currentUser]);

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

    const requiredPermission = STATUS_TRANSITION_PERMISSION_MAP[toStatus];
    if (requiredPermission && !hasPermission(currentUser, requiredPermission)) {
      setTransitionError("لا تملك صلاحية تنفيذ هذا الانتقال.");
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
    <section className="page-shell" dir="rtl">
      <div className="page-hero flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">الحالات</h1>
          <p className="text-muted-foreground">
            تابع كل حالة عبر مراحل الصيانة واسحب البطاقات بين الأعمدة المسموحة.
          </p>
        </div>
        {canCreateCase ? <Button size="lg" className="w-full sm:w-auto" asChild>
          <Link to="/cases/create">
            <Plus />
            إنشاء حالة جديدة
          </Link>
        </Button> : null}
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className="rounded-full border-[#d6deee] bg-white px-3 py-1 text-xs font-bold text-[#415CB3]"
            >
              {cases.length} حالة
            </Badge>
          </div>
          {groupedCases.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              لا توجد أعمدة متاحة لك في لوحة الحالات الحالية.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex min-h-[560px] min-w-max flex-row gap-4 pb-2">
                {groupedCases.map((column) => (
                  <WorkflowLane
                    key={column.key}
                    column={column}
                    draggedCase={draggedCase}
                    isCollapsed={collapsedColumns.includes(column.key)}
                    onToggle={() => toggleColumn(column.key)}
                    onDragStart={(caseItem) => setDraggedCase(caseItem)}
                    onDragEnd={() => setDraggedCase(null)}
                    onDrop={(event) => handleDrop(event, column)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
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
  const currentUser = getStoredUser();
  const canDrop =
    draggedCase &&
    ALLOWED_BOARD_TRANSITIONS[getWorkflowStatus(draggedCase.status)]?.includes(
      column.targetStatus
    ) &&
    hasPermission(currentUser, STATUS_TRANSITION_PERMISSION_MAP[column.targetStatus] ?? "cases.view");

  return (
    <section
      onDragOver={(event) => {
        if (canDrop) event.preventDefault();
      }}
      onDrop={onDrop}
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-[1.35rem] border bg-white shadow-xs transition-[width,background-color,border-color] duration-300",
        isCollapsed ? "w-16 border-dashed bg-slate-50" : "w-[300px] border-border",
        canDrop && "border-primary bg-primary/5"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 border-b border-border/70 p-3.5",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!isCollapsed && (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-extrabold text-foreground">
                {column.label}
              </h2>
              <Badge
                variant="outline"
                className="rounded-full border-[#d6deee] bg-[#f5f8ff] px-2.5 py-0.5 text-[11px] font-bold text-[#415CB3]"
              >
                {column.cases.length} حالة
              </Badge>
            </div>
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
          <Badge
            variant="outline"
            className="rounded-full border-[#d6deee] bg-[#f5f8ff] text-[#415CB3]"
          >
            {column.cases.length}
          </Badge>
          <span className="text-sm font-semibold text-foreground [text-orientation:mixed] [writing-mode:vertical-rl]">
            {column.label}
          </span>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 p-3.5">
          {column.cases.length === 0 ? (
            <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
              لا توجد حالات
            </div>
          ) : (
            column.cases.map((caseItem) => (
              <CaseCard
                key={caseItem.id}
                caseItem={caseItem}
                draggable={canMoveCaseFromStatus(currentUser, caseItem.status)}
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
  draggable,
  onDragStart,
  onDragEnd,
}: {
  caseItem: CaseRecord;
  draggable: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <Link
      to={`/cases/${caseItem.id}`}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      className={cn(
        "block rounded-[1.2rem] border border-border/80 bg-card p-4 shadow-2xs transition-all duration-150 hover:-translate-y-0.5 hover:border-[#cad5eb] hover:shadow-sm",
        !draggable && "cursor-default"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-extrabold tracking-tight text-primary">
            {caseItem.caseCode}
          </p>
          <h3 className="truncate text-[1.03rem] font-extrabold text-foreground">
            {caseItem.customerName ?? "عميل غير محدد"}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <CasePriorityBadge priority={caseItem.priority} />
          <CaseTypeBadge caseType={caseItem.caseType} />
        </div>
      </div>

      <div className="mt-3 space-y-2.5 text-sm text-muted-foreground">
        <p className="leading-6">
          <span className="font-bold text-foreground">الجهاز: </span>
          {getDeviceName(caseItem)}
        </p>
        <p className="line-clamp-2 leading-6">
          <span className="font-bold text-foreground">المشكلة: </span>
          {caseItem.customerComplaint}
        </p>
        <p className="text-[13px] font-medium text-[#415CB3]">
          <span className="font-bold">الفني: </span>
          {caseItem.technicianName || "غير معين"}
        </p>
      </div>
    </Link>
  );
}
