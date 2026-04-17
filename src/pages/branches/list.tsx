import { useList } from "@refinedev/core";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountingPageIntro, ErrorBanner, formatDate } from "../accounting/shared";

type Branch = {
  id: number;
  name: string;
  code: string;
  city: string;
  phone?: string | null;
  status: string;
  createdAt?: string | null;
  stats?: {
    totalCases: number;
    awaitingCenterReceipt: number;
  };
};

export function BranchesPage() {
  const { result, query } = useList<Branch>({ resource: "branches" });
  const branches = result.data ?? [];

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro title="الفروع" description="إدارة الفروع ومتابعة حجم الحالات القادمة منها." />
        <Button asChild><Link to="/branches/create">إضافة فرع</Link></Button>
      </div>
      <ErrorBanner message={query.error?.message || null} />
      {query.isLoading ? <p className="text-muted-foreground">جارٍ تحميل الفروع...</p> : null}
      {branches.length > 0 ? (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الفرع</TableHead>
                <TableHead className="text-right">الكود</TableHead>
                <TableHead className="text-right">المدينة</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الحالات</TableHead>
                <TableHead className="text-right">بانتظار الاستلام</TableHead>
                <TableHead className="text-right">تاريخ الإنشاء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">
                    <Link to={`/branches/${branch.id}`} className="hover:underline">{branch.name}</Link>
                  </TableCell>
                  <TableCell>{branch.code}</TableCell>
                  <TableCell>{branch.city}</TableCell>
                  <TableCell>{branch.status === "active" ? "نشط" : "معطل"}</TableCell>
                  <TableCell>{branch.stats?.totalCases ?? 0}</TableCell>
                  <TableCell>{branch.stats?.awaitingCenterReceipt ?? 0}</TableCell>
                  <TableCell>{formatDate(branch.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : !query.isLoading ? <p className="rounded-lg border p-4 text-sm text-muted-foreground">لا توجد فروع مسجلة بعد.</p> : null}
    </section>
  );
}
