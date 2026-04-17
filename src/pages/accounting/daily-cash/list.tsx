import { useEffect, useState } from "react";
import { useList } from "@refinedev/core";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasPermission } from "@/lib/access-control";
import { getStoredUser } from "@/providers/auth-provider";
import { apiClient } from "@/providers/api-client";
import { AccountingPageIntro, ErrorBanner, formatDate, formatMoney } from "../shared";

type DailyCash = {
  id: number;
  cashCode: string;
  shiftType: string;
  collectedAmount: string;
  netAmount: string;
  handedToTreasuryAmount: string;
  remainingWithEmployee: string;
  handoverStatus: string;
  date?: string | null;
};

export function AccountingDailyCashPage() {
  const { result, query } = useList<DailyCash>({ resource: "accounting-daily-cash" });
  const [summary, setSummary] = useState<any | null>(null);
  const records = result.data ?? [];
  const canManageDailyCash = hasPermission(getStoredUser(), "accounting.daily_cash.manage");

  useEffect(() => {
    apiClient("/api/accounting/daily-cash-summary").then(setSummary).catch(() => null);
  }, []);

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro
          title="اليومية النقدية"
          description="متابعة المبالغ اليومية قبل تسليمها إلى الخزينة."
          backTo="/accounting"
          backLabel="العودة إلى المحاسبة"
        />
        {canManageDailyCash ? (
          <Button asChild>
            <Link to="/accounting/daily-cash/create">إضافة سجل يومي</Link>
          </Button>
        ) : null}
      </div>
      <ErrorBanner message={query.error?.message || null} />
      {summary ? (
        <div className="grid gap-4 md:grid-cols-5">
          <SummaryCard label="المحصّل" value={formatMoney(summary.totalCollected)} />
          <SummaryCard label="المصاريف" value={formatMoney(summary.totalExpenses)} />
          <SummaryCard label="الصافي" value={formatMoney(summary.totalNet)} />
          <SummaryCard label="المسلّم للخزينة" value={formatMoney(summary.totalHanded)} />
          <SummaryCard label="المتبقي" value={formatMoney(summary.totalRemaining)} />
        </div>
      ) : null}
      {records.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الرمز</TableHead>
                  <TableHead className="text-right">الفترة</TableHead>
                  <TableHead className="text-right">المحصّل</TableHead>
                  <TableHead className="text-right">الصافي</TableHead>
                  <TableHead className="text-right">المسلّم</TableHead>
                  <TableHead className="text-right">المتبقي</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      <Link to={`/accounting/daily-cash/${record.id}`} className="hover:underline">
                        {record.cashCode}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {record.shiftType} - {formatDate(record.date)}
                    </TableCell>
                    <TableCell>{formatMoney(record.collectedAmount)}</TableCell>
                    <TableCell>{formatMoney(record.netAmount)}</TableCell>
                    <TableCell>{formatMoney(record.handedToTreasuryAmount)}</TableCell>
                    <TableCell>{formatMoney(record.remainingWithEmployee)}</TableCell>
                    <TableCell>{record.handoverStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : !query.isLoading ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">لا توجد سجلات يومية بعد.</p>
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
