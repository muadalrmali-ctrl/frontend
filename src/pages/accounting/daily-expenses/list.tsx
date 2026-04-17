import { useList } from "@refinedev/core";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountingPageIntro, ErrorBanner, formatDate, formatMoney } from "../shared";

type DailyExpense = {
  id: number;
  expenseCode: string;
  category: string;
  beneficiary: string;
  amount: string;
  paymentMethod: string;
  date?: string | null;
};

export function AccountingDailyExpensesPage() {
  const { result, query } = useList<DailyExpense>({ resource: "accounting-daily-expenses" });
  const expenses = result.data ?? [];

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro title="المصاريف اليومية" description="سجل المصاريف اليومية مع الجهة المستفيدة وطريقة الدفع." backTo="/accounting" backLabel="العودة إلى المحاسبة" />
        <Button asChild><Link to="/accounting/daily-expenses/create">إضافة مصروف</Link></Button>
      </div>
      <ErrorBanner message={query.error?.message || null} />
      {query.isLoading ? <p className="text-muted-foreground">جارٍ تحميل المصاريف...</p> : null}
      {expenses.length > 0 ? (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead className="text-right">الرمز</TableHead><TableHead className="text-right">الفئة</TableHead><TableHead className="text-right">المستفيد</TableHead><TableHead className="text-right">المبلغ</TableHead><TableHead className="text-right">طريقة الدفع</TableHead><TableHead className="text-right">التاريخ</TableHead></TableRow></TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium"><Link to={`/accounting/daily-expenses/${expense.id}`} className="hover:underline">{expense.expenseCode}</Link></TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell>{expense.beneficiary}</TableCell>
                  <TableCell>{formatMoney(expense.amount)}</TableCell>
                  <TableCell>{expense.paymentMethod}</TableCell>
                  <TableCell>{formatDate(expense.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : !query.isLoading ? <p className="rounded-lg border p-4 text-sm text-muted-foreground">لا توجد مصاريف يومية بعد.</p> : null}
    </section>
  );
}
