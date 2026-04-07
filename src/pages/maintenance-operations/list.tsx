import { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { Link } from "react-router";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [search, setSearch] = useState("");
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
                      <Badge variant={operation.status === "not_repairable" ? "destructive" : "default"}>{statusLabel(operation.status)}</Badge>
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
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>;
}
