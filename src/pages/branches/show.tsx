import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/providers/api-client";
import { AccountingPageIntro, ErrorBanner, formatDate } from "../accounting/shared";

type BranchCase = {
  id: number;
  caseCode: string;
  status: string;
  sourceType: string;
  customerComplaint?: string | null;
  branchNotes?: string | null;
  customerName?: string | null;
  deviceApplianceType?: string | null;
  deviceBrand?: string | null;
  deviceModelName?: string | null;
  createdAt?: string | null;
};

type BranchDetails = {
  id: number;
  name: string;
  code: string;
  city: string;
  address?: string | null;
  phone?: string | null;
  status: string;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  stats: {
    totalCases: number;
    awaitingCenterReceipt: number;
    newCases: number;
    repairedCases: number;
    notRepairableCases: number;
    completedOperations: number;
    activeCases: number;
    completedCases: number;
  };
  users: Array<{ id: number; name: string; email: string; role: string }>;
  cases: BranchCase[];
};

const getCaseStatusLabel = (status: string) => {
  switch (status) {
    case "awaiting_center_receipt":
      return "بانتظار الاستلام";
    case "received":
    case "new":
      return "جديدة";
    case "repaired":
      return "تم الإصلاح";
    case "not_repairable":
      return "غير قابلة للإصلاح";
    case "completed":
      return "مكتملة";
    default:
      return status.replaceAll("_", " ");
  }
};

const getDeviceName = (branchCase: BranchCase) =>
  [branchCase.deviceBrand, branchCase.deviceApplianceType, branchCase.deviceModelName].filter(Boolean).join(" ") || "-";

export function BranchDetailsPage() {
  const { id } = useParams();
  const [branch, setBranch] = useState<BranchDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!id) return;

    apiClient<BranchDetails>(`/api/branches/${id}`)
      .then((data) => {
        setBranch(data);
        setError(null);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "تعذر تحميل الفرع"));
  }, [id]);

  const filteredCases = useMemo(() => {
    if (!branch) return [];

    const normalizedSearch = search.trim().toLowerCase();
    return branch.cases.filter((branchCase) => {
      if (statusFilter !== "all" && branchCase.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [branchCase.caseCode, branchCase.customerName, branchCase.customerComplaint]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [branch, search, statusFilter]);

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro
          title={branch?.name || "تفاصيل الفرع"}
          description="عرض بيانات الفرع، إحصاءاته، والمستخدمين والحالات التابعة له."
          backTo="/accounting/branches"
          backLabel="العودة إلى الفروع"
        />
        <Button asChild variant="outline">
          <Link to={`/accounting/branches/${id}/edit`}>تعديل الفرع</Link>
        </Button>
      </div>

      <ErrorBanner message={error} />

      {branch ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>بيانات الفرع</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Info label="اسم الفرع" value={branch.name} />
              <Info label="كود الفرع" value={branch.code} />
              <Info label="الحالة" value={branch.status === "active" ? "نشط" : "معطل"} />
              <Info label="المدينة / المنطقة" value={branch.city} />
              <Info label="الهاتف" value={branch.phone || "-"} />
              <Info label="العنوان" value={branch.address || "-"} />
              <Info label="تاريخ الإنشاء" value={formatDate(branch.createdAt)} />
              <Info label="آخر تحديث" value={formatDate(branch.updatedAt)} />
              <div className="md:col-span-2">
                <Info label="ملاحظات" value={branch.notes || "-"} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>إحصائيات الفرع</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label="إجمالي الحالات" value={String(branch.stats.totalCases)} />
              <Info label="بانتظار الاستلام في المركز" value={String(branch.stats.awaitingCenterReceipt)} />
              <Info label="الحالات الجديدة" value={String(branch.stats.newCases)} />
              <Info label="تم الإصلاح" value={String(branch.stats.repairedCases)} />
              <Info label="غير قابلة للإصلاح" value={String(branch.stats.notRepairableCases)} />
              <Info label="العمليات المكتملة" value={String(branch.stats.completedOperations)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>مستخدمو الفرع</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {branch.users.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا يوجد مستخدمون مربوطون بهذا الفرع.</p>
              ) : (
                branch.users.map((user) => (
                  <div key={user.id} className="rounded-lg border p-3">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.email} - {user.role}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-4">
              <CardTitle>حالات الفرع</CardTitle>
              <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
                <Input
                  placeholder="ابحث برقم الحالة أو العميل أو وصف العطل"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="كل الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="awaiting_center_receipt">بانتظار الاستلام</SelectItem>
                    <SelectItem value="received">جديدة</SelectItem>
                    <SelectItem value="new">جديدة</SelectItem>
                    <SelectItem value="repaired">تم الإصلاح</SelectItem>
                    <SelectItem value="not_repairable">غير قابلة للإصلاح</SelectItem>
                    <SelectItem value="completed">مكتملة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredCases.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد حالات مطابقة لهذا الفرع حاليًا.</p>
              ) : (
                filteredCases.map((branchCase) => (
                  <Link
                    key={branchCase.id}
                    to={`/cases/${branchCase.id}`}
                    className="block rounded-lg border p-4 transition hover:bg-muted/20"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <p className="font-semibold text-primary">{branchCase.caseCode}</p>
                        <p className="text-sm font-medium">{branchCase.customerName || "عميل غير محدد"}</p>
                        <p className="text-sm text-muted-foreground">{getDeviceName(branchCase)}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {branchCase.customerComplaint || branchCase.branchNotes || "لا توجد ملاحظات"}
                        </p>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>{getCaseStatusLabel(branchCase.status)}</p>
                        <p>{formatDate(branchCase.createdAt)}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
