import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/providers/api-client";
import { AccountingPageIntro, ErrorBanner, formatDate, formatMoney } from "../shared";

type SupplierDetails = {
  supplier: {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    contactPerson?: string | null;
    notes?: string | null;
  };
  recentPurchases: Array<{
    id: number;
    purchaseCode: string;
    totalAmount: string;
    date?: string | null;
    receivingStatus: string;
  }>;
  totals: {
    totalPurchaseAmount: string;
    purchasesCount: number;
  };
};

export function AccountingSupplierDetailsPage() {
  const { id } = useParams();
  const [details, setDetails] = useState<SupplierDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<SupplierDetails>(`/api/accounting/suppliers/${id}`)
      .then(setDetails)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "تعذر تحميل المورد"));
  }, [id]);

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro title={details?.supplier.name || "تفاصيل المورد"} description="عرض بيانات المورد وسجل مشترياته الحديثة وإجمالياته." backTo="/accounting/suppliers" backLabel="العودة إلى الموردين" />
        <Button asChild variant="outline">
          <Link to={`/accounting/suppliers/${id}/edit`}>تعديل المورد</Link>
        </Button>
      </div>

      <ErrorBanner message={error} />

      {details ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label="عدد المشتريات" value={String(details.totals.purchasesCount)} />
            <SummaryCard label="إجمالي المشتريات" value={formatMoney(details.totals.totalPurchaseAmount)} />
            <SummaryCard label="جهة الاتصال" value={details.supplier.contactPerson || "-"} />
          </div>

          <Card>
            <CardHeader><CardTitle>بيانات المورد</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Info label="الاسم" value={details.supplier.name} />
              <Info label="الهاتف" value={details.supplier.phone || "-"} />
              <Info label="البريد الإلكتروني" value={details.supplier.email || "-"} />
              <Info label="العنوان" value={details.supplier.address || "-"} />
              <div className="md:col-span-2"><Info label="ملاحظات" value={details.supplier.notes || "-"} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>أحدث المشتريات</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              {details.recentPurchases.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد مشتريات مرتبطة بهذا المورد بعد.</p>
              ) : (
                details.recentPurchases.map((purchase) => (
                  <Link key={purchase.id} to={`/accounting/purchases/${purchase.id}`} className="rounded-lg border p-4 transition hover:bg-muted/30">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{purchase.purchaseCode}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(purchase.date)}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{formatMoney(purchase.totalAmount)}</p>
                        <p className="text-sm text-muted-foreground">{purchase.receivingStatus}</p>
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-muted/20 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>;
}
