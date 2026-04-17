import { useList } from "@refinedev/core";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasPermission } from "@/lib/access-control";
import { getStoredUser } from "@/providers/auth-provider";
import { AccountingPageIntro, ErrorBanner, formatDate, formatMoney } from "../shared";

type Purchase = {
  id: number;
  purchaseCode: string;
  supplierName?: string | null;
  purchaseType: string;
  paymentMethod: string;
  receivingStatus: string;
  totalAmount: string;
  date?: string | null;
  stockAppliedAt?: string | null;
};

export function AccountingPurchasesPage() {
  const { result, query } = useList<Purchase>({ resource: "accounting-purchases" });
  const purchases = result.data ?? [];
  const canManagePurchases = hasPermission(getStoredUser(), "accounting.purchases.manage");

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro
          title="المشتريات"
          description="سجل مشتريات الموردين وربطها بالمخزون والاستلام."
          backTo="/accounting"
          backLabel="العودة إلى المحاسبة"
        />
        {canManagePurchases ? (
          <Button asChild>
            <Link to="/accounting/purchases/create">إنشاء عملية شراء</Link>
          </Button>
        ) : null}
      </div>
      <ErrorBanner message={query.error?.message || null} />
      {query.isLoading ? <p className="text-muted-foreground">جارٍ تحميل المشتريات...</p> : null}
      {purchases.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الرمز</TableHead>
                  <TableHead className="text-right">المورد</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">
                      <Link to={`/accounting/purchases/${purchase.id}`} className="hover:underline">
                        {purchase.purchaseCode}
                      </Link>
                    </TableCell>
                    <TableCell>{purchase.supplierName || "-"}</TableCell>
                    <TableCell>{purchase.purchaseType}</TableCell>
                    <TableCell>{purchase.stockAppliedAt ? "تم تأكيد المخزون" : purchase.receivingStatus}</TableCell>
                    <TableCell>{formatMoney(purchase.totalAmount)}</TableCell>
                    <TableCell>{formatDate(purchase.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : !query.isLoading ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">لا توجد عمليات شراء بعد.</p>
      ) : null}
    </section>
  );
}
