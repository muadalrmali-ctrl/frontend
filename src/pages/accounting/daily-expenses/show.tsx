import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/providers/api-client";
import { AccountingPageIntro, ErrorBanner, formatDate, formatMoney } from "../shared";

export function AccountingDailyExpenseDetailsPage() {
  const { id } = useParams();
  const [expense, setExpense] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient(`/api/accounting/daily-expenses/${id}`)
      .then(setExpense)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "تعذر تحميل المصروف"));
  }, [id]);

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro title={expense?.expenseCode || "تفاصيل المصروف"} description="عرض بيانات المصروف اليومي والإيصال المرتبط به." backTo="/accounting/daily-expenses" backLabel="العودة إلى المصاريف" />
        <Button asChild variant="outline"><Link to={`/accounting/daily-expenses/${id}/edit`}>تعديل</Link></Button>
      </div>
      <ErrorBanner message={error} />
      {expense ? (
        <Card>
          <CardHeader><CardTitle>بيانات المصروف</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Info label="الرمز" value={expense.expenseCode} />
            <Info label="التاريخ" value={formatDate(expense.date)} />
            <Info label="الفئة" value={expense.category} />
            <Info label="المبلغ" value={formatMoney(expense.amount)} />
            <Info label="طريقة الدفع" value={expense.paymentMethod} />
            <Info label="المستفيد" value={expense.beneficiary} />
            <div className="md:col-span-2"><Info label="الوصف" value={expense.description} /></div>
            <div className="md:col-span-2"><Info label="رابط الإيصال" value={expense.receiptImageUrl || "-"} /></div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-muted/20 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>;
}
