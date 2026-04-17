import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/access-control";
import { getStoredUser } from "@/providers/auth-provider";
import { apiClient } from "@/providers/api-client";
import { AccountingPageIntro, ErrorBanner, formatDate, formatMoney } from "../shared";

type PurchaseDetails = {
  purchase: {
    id: number;
    purchaseCode: string;
    date?: string | null;
    supplierId: number;
    supplierName?: string | null;
    purchaseType: string;
    paymentMethod: string;
    receivingStatus: string;
    totalAmount: string;
    notes?: string | null;
    confirmedAt?: string | null;
    stockAppliedAt?: string | null;
  };
  items: Array<{
    id: number;
    itemName: string;
    itemType: string;
    inventoryItemId?: number | null;
    inventoryName?: string | null;
    inventoryCode?: string | null;
    quantity: number;
    unitCost: string;
    totalCost: string;
  }>;
};

export function AccountingPurchaseDetailsPage() {
  const { id } = useParams();
  const [details, setDetails] = useState<PurchaseDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const canManagePurchases = hasPermission(getStoredUser(), "accounting.purchases.manage");

  const loadDetails = async () => {
    try {
      setDetails(await apiClient<PurchaseDetails>(`/api/accounting/purchases/${id}`));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تحميل عملية الشراء");
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const confirmPurchase = async () => {
    setError(null);
    setIsConfirming(true);
    try {
      await apiClient(`/api/accounting/purchases/${id}/confirm`, { method: "POST", body: {} });
      await loadDetails();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تأكيد الشراء");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro
          title={details?.purchase.purchaseCode || "تفاصيل الشراء"}
          description="عرض عملية الشراء وعناصرها وحالة إدخال المخزون."
          backTo="/accounting/purchases"
          backLabel="العودة إلى المشتريات"
        />
        {canManagePurchases ? (
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link to={`/accounting/purchases/${id}/edit`}>تعديل</Link>
            </Button>
            <Button onClick={confirmPurchase} disabled={isConfirming || Boolean(details?.purchase.stockAppliedAt)}>
              {details?.purchase.stockAppliedAt
                ? "تم تأكيد المخزون"
                : isConfirming
                  ? "جارٍ التأكيد..."
                  : "تأكيد الاستلام وإضافة المخزون"}
            </Button>
          </div>
        ) : null}
      </div>

      <ErrorBanner message={error} />

      {details ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label="الإجمالي" value={formatMoney(details.purchase.totalAmount)} />
            <SummaryCard label="المورد" value={details.purchase.supplierName || "-"} />
            <SummaryCard
              label="الحالة"
              value={details.purchase.stockAppliedAt ? "تم إدخال المخزون" : details.purchase.receivingStatus}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>بيانات الشراء</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Info label="التاريخ" value={formatDate(details.purchase.date)} />
              <Info label="طريقة الدفع" value={details.purchase.paymentMethod} />
              <Info label="نوع الشراء" value={details.purchase.purchaseType} />
              <Info
                label="تأكيد الشراء"
                value={details.purchase.confirmedAt ? formatDate(details.purchase.confirmedAt) : "لم يتم بعد"}
              />
              <div className="md:col-span-2">
                <Info label="ملاحظات" value={details.purchase.notes || "-"} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>العناصر</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {details.items.map((item) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Info label="العنصر" value={item.itemName} />
                    <Info label="النوع" value={item.itemType} />
                    <Info label="الكمية" value={String(item.quantity)} />
                    <Info label="الإجمالي" value={formatMoney(item.totalCost)} />
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    {item.inventoryItemId
                      ? `مرتبط بالمخزون: ${item.inventoryName || "-"} (${item.inventoryCode || "-"})`
                      : "غير مرتبط بالمخزون"}
                  </div>
                </div>
              ))}
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
  return (
    <div className="rounded-lg bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
