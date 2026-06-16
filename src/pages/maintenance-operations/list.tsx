import { useMemo, useState } from "react";
import { useList, useNotification } from "@refinedev/core";
import { Link } from "react-router";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { hasPermission } from "@/lib/access-control";
import { apiClient } from "@/providers/api-client";
import { getStoredUser } from "@/providers/auth-provider";

type Operation = {
  id: number;
  caseCode: string;
  status: string;
  finalResult?: string | null;
  notRepairableReason?: string | null;
  operationFinalizedAt?: string | null;
  executionCompletedAt?: string | null;
  customerName?: string | null;
  deviceApplianceType?: string | null;
  deviceBrand?: string | null;
  deviceModelName?: string | null;
  technicianName?: string | null;
};

const statusLabel = (status: string) =>
  status === "not_repairable" ? "لا يمكن إصلاحها" : "تم الإصلاح";

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "غير محدد";

export function MaintenanceOperationsPage() {
  const currentUser = getStoredUser();
  const canDeleteOperation = hasPermission(currentUser, "delete_maintenance_operation");
  const { open } = useNotification();
  const [search, setSearch] = useState("");
  const [operationToDelete, setOperationToDelete] = useState<Operation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { result, query } = useList<Operation>({ resource: "maintenance-operations" });
  const operations = result.data ?? [];

  const filteredOperations = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return operations;
    return operations.filter((operation) =>
      [
        operation.caseCode,
        operation.customerName,
        operation.deviceApplianceType,
        operation.deviceBrand,
        operation.deviceModelName,
        operation.technicianName,
        operation.finalResult,
        operation.notRepairableReason,
      ].filter(Boolean).join(" ").toLowerCase().includes(value)
    );
  }, [operations, search]);

  const deleteOperation = async () => {
    if (!operationToDelete) return;

    setIsDeleting(true);
    try {
      await apiClient(`/api/cases/maintenance-operations/${operationToDelete.id}`, {
        method: "DELETE",
      });
      open?.({
        type: "success",
        message: "تم حذف العملية",
        description: "تم حذف عملية الصيانة من الأرشيف.",
      });
      setOperationToDelete(null);
      await query.refetch();
    } catch (error) {
      open?.({
        type: "error",
        message: "تعذر حذف العملية",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">عمليات الصيانة</h1>
          <p className="text-muted-foreground">أرشيف نتائج الصيانة المكتملة، سواء تم الإصلاح أو تعذر الإصلاح.</p>
        </div>
        <Input className="md:w-80" placeholder="ابحث برقم الحالة أو العميل أو الجهاز..." value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      {query.isLoading && <p className="text-muted-foreground">جاري تحميل العمليات...</p>}
      {query.error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{query.error.message}</p>}

      {!query.isLoading && !query.error && (
        <div className="grid gap-4">
          {filteredOperations.length === 0 ? (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">لا توجد عمليات مكتملة.</p>
          ) : (
            filteredOperations.map((operation) => (
              <Link key={operation.id} to={`/maintenance-operations/${operation.id}`}>
                <Card className="rounded-lg transition hover:border-primary/50">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle>{operation.caseCode}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={operation.status === "not_repairable" ? "destructive" : "default"}>{statusLabel(operation.status)}</Badge>
                        {canDeleteOperation ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setOperationToDelete(operation);
                            }}
                          >
                            <Trash2 className="size-4" />
                            حذف العملية
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-4">
                    <Info label="العميل" value={operation.customerName || "غير محدد"} />
                    <Info label="الجهاز" value={[operation.deviceBrand, operation.deviceApplianceType, operation.deviceModelName].filter(Boolean).join(" ") || "غير محدد"} />
                    <Info label="الفني" value={operation.technicianName || "غير محدد"} />
                    <Info label="تاريخ الإنهاء" value={formatDate(operation.operationFinalizedAt || operation.executionCompletedAt)} />
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      <AlertDialog open={Boolean(operationToDelete)} onOpenChange={(openState) => !openState && setOperationToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العملية</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف عملية الصيانة؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={deleteOperation} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "جاري الحذف..." : "تأكيد الحذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>;
}
