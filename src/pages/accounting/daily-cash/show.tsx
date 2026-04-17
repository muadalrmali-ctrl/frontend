import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/access-control";
import { getStoredUser } from "@/providers/auth-provider";
import { apiClient } from "@/providers/api-client";
import { AccountingPageIntro, ErrorBanner, formatDate, formatMoney } from "../shared";

export function AccountingDailyCashDetailsPage() {
  const { id } = useParams();
  const [record, setRecord] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManageDailyCash = hasPermission(getStoredUser(), "accounting.daily_cash.manage");

  useEffect(() => {
    apiClient(`/api/accounting/daily-cash/${id}`)
      .then(setRecord)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "تعذر تحميل اليومية"));
  }, [id]);

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro
          title={record?.cashCode || "تفاصيل اليومية النقدية"}
          description="عرض تحصيل اليوم ومبالغ التسليم للخزينة."
          backTo="/accounting/daily-cash"
          backLabel="العودة إلى اليومية النقدية"
        />
        {canManageDailyCash ? (
          <Button asChild variant="outline">
            <Link to={`/accounting/daily-cash/${id}/edit`}>تعديل</Link>
          </Button>
        ) : null}
      </div>
      <ErrorBanner message={error} />
      {record ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard label="المحصّل" value={formatMoney(record.collectedAmount)} />
            <SummaryCard label="المصاريف" value={formatMoney(record.expensesAmount)} />
            <SummaryCard label="الصافي" value={formatMoney(record.netAmount)} />
            <SummaryCard label="المتبقي" value={formatMoney(record.remainingWithEmployee)} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>البيانات</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Info label="التاريخ" value={formatDate(record.date)} />
              <Info label="الفترة" value={record.shiftType} />
              <Info label="الموظف" value={record.employeeName || record.createdByName || "-"} />
              <Info label="حالة التسليم" value={record.handoverStatus} />
              <Info label="التعديل اليدوي" value={formatMoney(record.manualAdjustment)} />
              <Info label="المسلّم للخزينة" value={formatMoney(record.handedToTreasuryAmount)} />
              <div className="md:col-span-2">
                <Info label="ملاحظات" value={record.notes || "-"} />
              </div>
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
