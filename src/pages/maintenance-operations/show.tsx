import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/providers/api-client";

type OperationDetails = {
  caseData: any;
  customer: any;
  device: any;
  assignedTechnician: any;
};

type OperationPart = { id: number; quantity: number; unitPrice: string; totalPrice: string; inventoryName?: string | null; inventoryCode?: string | null };
type OperationService = { id: number; serviceName: string; quantity: number; unitPrice: string; totalPrice: string };

const parseImages = (value?: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "غير محدد";

const toNumber = (value?: string | number | null) => Number(value || 0);
const formatMoney = (value: number) => `${value.toLocaleString("ar-LY")} د.ل`;

export function MaintenanceOperationDetailsPage() {
  const { id } = useParams();
  const [details, setDetails] = useState<OperationDetails | null>(null);
  const [parts, setParts] = useState<OperationPart[]>([]);
  const [services, setServices] = useState<OperationService[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient<OperationDetails>(`/api/cases/maintenance-operations/${id}`),
      apiClient<OperationPart[]>(`/api/cases/${id}/parts`),
      apiClient<OperationService[]>(`/api/cases/${id}/services`),
    ])
      .then(([operationDetails, operationParts, operationServices]) => {
        setDetails(operationDetails);
        setParts(operationParts);
        setServices(operationServices);
      })
      .catch((error) => setError(error instanceof Error ? error.message : "تعذر تحميل العملية"));
  }, [id]);

  const caseData = details?.caseData;
  const repairImages = parseImages(caseData?.postRepairImages);
  const damagedImages = parseImages(caseData?.postRepairDamagedPartImages);

  return (
    <section className="space-y-6" dir="rtl">
      <Button variant="ghost" asChild><Link to="/maintenance-operations"><ArrowRight /> العودة للعمليات</Link></Button>
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {details && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">عملية {caseData.caseCode}</h1>
            <Badge variant={caseData.status === "not_repairable" ? "destructive" : "default"}>{caseData.status === "not_repairable" ? "لا يمكن إصلاحها" : "تم الإصلاح"}</Badge>
          </div>
          <Card><CardHeader><CardTitle>الملخص النهائي</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">
            <Info label="العميل" value={details.customer?.name || "غير محدد"} />
            <Info label="الجهاز" value={[details.device?.brand, details.device?.applianceType, details.device?.modelName].filter(Boolean).join(" ") || "غير محدد"} />
            <Info label="الفني" value={details.assignedTechnician?.name || caseData.technicianName || "غير محدد"} />
            <Info label="تاريخ الإنهاء" value={formatDate(caseData.operationFinalizedAt || caseData.executionCompletedAt)} />
            <Info label="العمل المنجز" value={caseData.postRepairCompletedWork || "غير محدد"} />
            <Info label="سبب عدم التمكن من الإصلاح" value={caseData.notRepairableReason || caseData.finalResult || "غير محدد"} />
          </CardContent></Card>
          <Card><CardHeader><CardTitle>فحص الجودة والبيانات المحفوظة</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">
            <Info label="اختبار الجهاز" value={caseData.postRepairTested ? `نعم - ${caseData.postRepairTestCount || 1} مرات` : "لا"} />
            <Info label="تنظيف الجهاز" value={caseData.postRepairCleaned ? "نعم" : "لا"} />
            <Info label="نصائح فنية" value={caseData.postRepairRecommendations || "غير محدد"} />
            <Info label="ملاحظة الفني" value={caseData.postRepairNote || "غير محدد"} />
          </CardContent></Card>
          <InvoiceArchive parts={parts} services={services} />
          <ImageGrid title="صور الجهاز بعد الإصلاح" images={repairImages} />
          <ImageGrid title="القطعة المعطوبة" images={damagedImages} />
        </>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap font-medium">{value}</p></div>;
}

function ImageGrid({ title, images }: { title: string; images: string[] }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-4">{images.length === 0 ? <p className="text-muted-foreground">لا توجد صور</p> : images.map((image, index) => <img key={index} src={image} alt={`${title} ${index + 1}`} className="aspect-video rounded-lg border object-cover" />)}</CardContent></Card>;
}

function InvoiceArchive({ parts, services }: { parts: OperationPart[]; services: OperationService[] }) {
  const partsTotal = parts.reduce((sum, part) => sum + toNumber(part.totalPrice), 0);
  const servicesTotal = services.reduce((sum, service) => sum + toNumber(service.totalPrice), 0);

  return (
    <Card>
      <CardHeader><CardTitle>الفاتورة النهائية</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <h3 className="font-medium">قطع الغيار</h3>
          {parts.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد قطع مسجلة</p> : parts.map((part) => (
            <div key={part.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-5">
              <Info label="القطعة" value={part.inventoryName || "قطعة"} />
              <Info label="الكود" value={part.inventoryCode || "-"} />
              <Info label="الكمية" value={String(part.quantity)} />
              <Info label="السعر" value={formatMoney(toNumber(part.unitPrice))} />
              <Info label="الإجمالي" value={formatMoney(toNumber(part.totalPrice))} />
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          <h3 className="font-medium">الخدمات</h3>
          {services.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد خدمات مسجلة</p> : services.map((service) => (
            <div key={service.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-3">
              <Info label="الخدمة" value={service.serviceName} />
              <Info label="الكمية" value={String(service.quantity)} />
              <Info label="الإجمالي" value={formatMoney(toNumber(service.totalPrice))} />
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Info label="إجمالي القطع" value={formatMoney(partsTotal)} />
          <Info label="إجمالي الخدمات" value={formatMoney(servicesTotal)} />
          <Info label="الإجمالي النهائي" value={formatMoney(partsTotal + servicesTotal)} />
        </div>
      </CardContent>
    </Card>
  );
}
