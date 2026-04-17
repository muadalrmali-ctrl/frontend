import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useCustom } from "@refinedev/core";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/providers/api-client";

type CenterReceiptCase = {
  id: number;
  caseCode: string;
  customerName?: string | null;
  customerPhone?: string | null;
  branchName?: string | null;
  branchCode?: string | null;
  deviceApplianceType?: string | null;
  deviceBrand?: string | null;
  deviceModelName?: string | null;
  createdAt?: string | null;
};

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";

export function CenterReceiptCasesPage() {
  const [search, setSearch] = useState("");
  const { result, query } = useCustom<CenterReceiptCase[]>({
    url: "/api/cases/awaiting-center-receipt",
    method: "get",
  });

  const cases = result?.data ?? [];
  const filteredCases = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return cases;
    return cases.filter((caseItem) =>
      [caseItem.caseCode, caseItem.customerName, caseItem.branchName, caseItem.branchCode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [cases, search]);

  const confirmReceipt = async (id: number) => {
    await apiClient(`/api/cases/${id}/center-receipt`, {
      method: "PATCH",
      body: {},
    });
    await query.refetch();
  };

  return (
    <section className="space-y-6" dir="rtl">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">بانتظار الاستلام في المركز</h1>
        <p className="text-muted-foreground">مراجعة الحالات القادمة من الفروع وتأكيد استلام الجهاز فعليًا في المركز الرئيسي.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pr-9" placeholder="ابحث برقم الحالة أو الفرع أو اسم العميل" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="text-sm text-muted-foreground">{filteredCases.length} حالة</div>
        </CardContent>
      </Card>

      {query.isLoading ? <p className="text-muted-foreground">جارٍ تحميل الحالات...</p> : null}
      {query.error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{query.error.message}</p> : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الحالة</TableHead>
                <TableHead className="text-right">الفرع</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">الجهاز</TableHead>
                <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((caseItem) => (
                <TableRow key={caseItem.id}>
                  <TableCell className="font-medium">{caseItem.caseCode}</TableCell>
                  <TableCell>{caseItem.branchName || "-"} {caseItem.branchCode ? `(${caseItem.branchCode})` : ""}</TableCell>
                  <TableCell>{caseItem.customerName || "-"}</TableCell>
                  <TableCell>{[caseItem.deviceBrand, caseItem.deviceApplianceType, caseItem.deviceModelName].filter(Boolean).join(" ") || "-"}</TableCell>
                  <TableCell>{formatDate(caseItem.createdAt)}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button asChild variant="outline" size="sm"><Link to={`/cases/${caseItem.id}`}>فتح التفاصيل</Link></Button>
                    <Button size="sm" onClick={() => confirmReceipt(caseItem.id)}>تم الاستلام في المركز</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredCases.length && !query.isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">لا توجد حالات بانتظار الاستلام في المركز.</TableCell></TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
