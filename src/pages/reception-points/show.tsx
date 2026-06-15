import { useShow } from "@refinedev/core";
import { Link, useParams } from "react-router";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PointDetails = {
  id: number;
  name: string;
  city: string;
  area?: string | null;
  address?: string | null;
  phone?: string | null;
  managerName?: string | null;
  status: string;
  notes?: string | null;
  stats: Record<string, number>;
  cases: Array<{
    id: number;
    caseCode: string;
    status: string;
    processingMode: string;
    transferStatus: string;
    customerName?: string | null;
    customerPhone?: string | null;
    customerComplaint: string;
    deviceBrand?: string | null;
    deviceApplianceType?: string | null;
    deviceModelName?: string | null;
  }>;
};

export function ReceptionPointDetailsPage() {
  const { id } = useParams();
  const { query, result } = useShow<PointDetails>({ resource: "reception-points", id });
  const point = result ?? null;

  if (query.isLoading) return <p className="text-muted-foreground" dir="rtl">جار تحميل نقطة الاستلام...</p>;
  if (!point) return <p className="rounded-lg border p-4 text-sm text-muted-foreground" dir="rtl">لم يتم العثور على نقطة الاستلام.</p>;

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{point.name}</h1>
          <p className="text-muted-foreground">{[point.city, point.area, point.address].filter(Boolean).join(" - ")}</p>
        </div>
        <Button variant="outline" asChild><Link to="/reception-points"><ArrowRight /> العودة</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="إجمالي الحالات" value={point.stats.totalCases ?? 0} />
        <Metric label="قيد النقل" value={point.stats.casesInTransit ?? 0} />
        <Metric label="تم الاستلام" value={point.stats.casesReceivedByMainCenter ?? 0} />
        <Metric label="صيانة محلية" value={point.stats.localRepairCases ?? 0} />
      </div>

      <Card>
        <CardHeader><CardTitle>الحالات المرتبطة</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {point.cases.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد حالات لهذه النقطة.</p> : null}
          {point.cases.map((item: PointDetails["cases"][number]) => (
            <Link key={item.id} to={`/cases/${item.id}`} className="rounded-lg border p-3 transition hover:border-[#415CB3]/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-primary">{item.caseCode}</p>
                <div className="flex gap-2">
                  <Badge variant="outline">{item.processingMode === "local_repair" ? "صيانة محلية" : "إرسال إلى المركز"}</Badge>
                  <Badge variant="secondary">{item.status}</Badge>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.customerName || "عميل غير محدد"} - {[item.deviceBrand, item.deviceApplianceType, item.deviceModelName].filter(Boolean).join(" ")}</p>
              <p className="mt-1 line-clamp-1 text-sm">{item.customerComplaint}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="p-4"><p className="text-2xl font-bold text-[#415CB3]">{value}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>;
}
