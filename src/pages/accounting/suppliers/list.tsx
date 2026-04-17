import { useList } from "@refinedev/core";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasPermission } from "@/lib/access-control";
import { getStoredUser } from "@/providers/auth-provider";
import { AccountingPageIntro, ErrorBanner, formatDate } from "../shared";

type Supplier = {
  id: number;
  name: string;
  phone?: string | null;
  contactPerson?: string | null;
  createdAt?: string | null;
};

export function AccountingSuppliersPage() {
  const { result, query } = useList<Supplier>({ resource: "accounting-suppliers" });
  const suppliers = result.data ?? [];
  const canManageSuppliers = hasPermission(getStoredUser(), "accounting.suppliers.manage");

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro
          title="الموردون"
          description="إدارة الموردين وربطهم بالمشتريات وسجل التوريد."
          backTo="/accounting"
          backLabel="العودة إلى المحاسبة"
        />
        {canManageSuppliers ? (
          <Button asChild>
            <Link to="/accounting/suppliers/create">إضافة مورد</Link>
          </Button>
        ) : null}
      </div>

      <ErrorBanner message={query.error?.message || null} />
      {query.isLoading ? <p className="text-muted-foreground">جارٍ تحميل الموردين...</p> : null}
      {!query.isLoading && suppliers.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">لا يوجد موردون بعد.</p>
      ) : null}

      {suppliers.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم المورد</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">جهة الاتصال</TableHead>
                  <TableHead className="text-right">تاريخ الإضافة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      <Link to={`/accounting/suppliers/${supplier.id}`} className="hover:underline">
                        {supplier.name}
                      </Link>
                    </TableCell>
                    <TableCell>{supplier.phone || "-"}</TableCell>
                    <TableCell>{supplier.contactPerson || "-"}</TableCell>
                    <TableCell>{formatDate(supplier.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
