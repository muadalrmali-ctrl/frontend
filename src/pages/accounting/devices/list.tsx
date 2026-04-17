import { useList } from "@refinedev/core";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountingPageIntro, ErrorBanner, formatDate } from "../shared";

type Device = {
  id: number;
  applianceType: string;
  brand: string;
  modelName: string;
  modelCode?: string | null;
  createdAt?: string | null;
};

export function AccountingDevicesPage() {
  const { result, query } = useList<Device>({ resource: "accounting-devices" });
  const devices = result.data ?? [];

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro title="الأجهزة" description="مرجع الأجهزة والموديلات المستخدمة في المركز." backTo="/accounting" backLabel="العودة إلى المحاسبة" />
        <Button asChild><Link to="/accounting/devices/create">إضافة جهاز</Link></Button>
      </div>
      <ErrorBanner message={query.error?.message || null} />
      {query.isLoading ? <p className="text-muted-foreground">جارٍ تحميل الأجهزة...</p> : null}
      {devices.length > 0 ? (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead className="text-right">النوع</TableHead><TableHead className="text-right">الماركة</TableHead><TableHead className="text-right">الموديل</TableHead><TableHead className="text-right">الكود</TableHead><TableHead className="text-right">التاريخ</TableHead></TableRow></TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium"><Link to={`/accounting/devices/${device.id}`} className="hover:underline">{device.applianceType}</Link></TableCell>
                  <TableCell>{device.brand}</TableCell>
                  <TableCell>{device.modelName}</TableCell>
                  <TableCell>{device.modelCode || "-"}</TableCell>
                  <TableCell>{formatDate(device.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : !query.isLoading ? <p className="rounded-lg border p-4 text-sm text-muted-foreground">لا توجد أجهزة مسجلة بعد.</p> : null}
    </section>
  );
}
