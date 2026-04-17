import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/providers/api-client";
import { AccountingPageIntro, ErrorBanner, formatDate } from "../accounting/shared";

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
    activeCases: number;
    completedCases: number;
  };
  users: Array<{ id: number; name: string; email: string; role: string }>;
  cases: Array<{ id: number; caseCode: string; status: string; sourceType: string; createdAt?: string | null }>;
};

export function BranchDetailsPage() {
  const { id } = useParams();
  const [branch, setBranch] = useState<BranchDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<BranchDetails>(`/api/branches/${id}`)
      .then(setBranch)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "تعذر تحميل الفرع"));
  }, [id]);

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro title={branch?.name || "تفاصيل الفرع"} description="عرض بيانات الفرع والحالات التابعة له." backTo="/branches" backLabel="العودة إلى الفروع" />
        <Button asChild variant="outline"><Link to={`/branches/${id}/edit`}>تعديل الفرع</Link></Button>
      </div>
      <ErrorBanner message={error} />
      {branch ? (
        <>
          <Card>
            <CardHeader><CardTitle>بيانات الفرع</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Info label="الاسم" value={branch.name} />
              <Info label="الكود" value={branch.code} />
              <Info label="المدينة / المنطقة" value={branch.city} />
              <Info label="الهاتف" value={branch.phone || "-"} />
              <Info label="الحالة" value={branch.status === "active" ? "نشط" : "معطل"} />
              <Info label="العنوان" value={branch.address || "-"} />
              <Info label="تاريخ الإنشاء" value={formatDate(branch.createdAt)} />
              <Info label="آخر تحديث" value={formatDate(branch.updatedAt)} />
              <div className="md:col-span-2"><Info label="ملاحظات" value={branch.notes || "-"} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>إحصائيات الفرع</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <Info label="إجمالي الحالات" value={String(branch.stats.totalCases)} />
              <Info label="بانتظار الاستلام" value={String(branch.stats.awaitingCenterReceipt)} />
              <Info label="الحالات النشطة" value={String(branch.stats.activeCases)} />
              <Info label="العمليات المكتملة" value={String(branch.stats.completedCases)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>مستخدمو الفرع</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {branch.users.length === 0 ? <p className="text-sm text-muted-foreground">لا يوجد مستخدمون مربوطون بهذا الفرع.</p> : branch.users.map((user) => (
                <div key={user.id} className="rounded-lg border p-3">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email} - {user.role}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>الحالات التابعة للفرع</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {branch.cases.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد حالات لهذا الفرع بعد.</p> : branch.cases.slice(0, 20).map((branchCase) => (
                <Link key={branchCase.id} to={`/cases/${branchCase.id}`} className="block rounded-lg border p-3 hover:bg-muted/20">
                  <p className="font-medium">{branchCase.caseCode}</p>
                  <p className="text-sm text-muted-foreground">{branchCase.status} - {formatDate(branchCase.createdAt)}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-muted/20 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>;
}
