import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentGallery } from "@/components/cases/case-attachments";
import { hasPermission } from "@/lib/access-control";
import {
  buildLegacyCaseAttachments,
  filterAttachments,
  mergeCaseAttachments,
  normalizeCaseAttachments,
  type CaseAttachment,
  type RawCaseAttachment,
} from "@/lib/case-attachments";
import { apiClient } from "@/providers/api-client";
import { getStoredUser } from "@/providers/auth-provider";

type OperationDetails = {
  caseData: any;
  customer: any;
  device: any;
  assignedTechnician: any;
};

type OperationPart = {
  id: number;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  inventoryName?: string | null;
  inventoryCode?: string | null;
};

type OperationService = {
  id: number;
  serviceName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

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
  const currentUser = getStoredUser();
  const canViewQualityData = hasPermission(currentUser, "maintenance_operations.quality_saved_data.view");
  const canViewFinalInvoice = hasPermission(currentUser, "maintenance_operations.final_invoice.view");
  const canViewRepairImages = hasPermission(currentUser, "maintenance_operations.after_repair_image.view");
  const canViewRepairVideos = hasPermission(currentUser, "maintenance_operations.after_repair_video.view");
  const canViewDamagedPartImages = hasPermission(currentUser, "maintenance_operations.damaged_part_image.view");
  const { id } = useParams();
  const [details, setDetails] = useState<OperationDetails | null>(null);
  const [parts, setParts] = useState<OperationPart[]>([]);
  const [services, setServices] = useState<OperationService[]>([]);
  const [attachments, setAttachments] = useState<CaseAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient<OperationDetails>(`/api/cases/maintenance-operations/${id}`),
      apiClient<OperationPart[]>(`/api/cases/${id}/parts`),
      apiClient<OperationService[]>(`/api/cases/${id}/services`),
      apiClient<RawCaseAttachment[]>(`/api/media/case/${id}`),
    ])
      .then(([operationDetails, operationParts, operationServices, media]) => {
        setDetails(operationDetails);
        setParts(operationParts);
        setServices(operationServices);
        setAttachments(normalizeCaseAttachments(media));
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "تعذر تحميل العملية"));
  }, [id]);

  const caseData = details?.caseData;
  const repairImages = parseImages(caseData?.postRepairImages);
  const repairVideos = parseImages(caseData?.postRepairVideos);
  const damagedImages = parseImages(caseData?.postRepairDamagedPartImages);
  const isUnrepaired = caseData?.status === "not_repairable";

  const mergedAttachments = useMemo(
    () =>
      mergeCaseAttachments(
        attachments,
        caseData
          ? buildLegacyCaseAttachments({
              caseId: caseData.id,
              repairImages,
              repairVideos,
              damagedPartImages: damagedImages,
            })
          : []
      ),
    [attachments, caseData, damagedImages, repairImages, repairVideos]
  );

  const repairImageAttachments = filterAttachments(mergedAttachments, { type: "image", category: "repair_completion" });
  const repairVideoAttachments = filterAttachments(mergedAttachments, { type: "video", category: "repair_completion" });
  const repairAudioAttachments = filterAttachments(mergedAttachments, { type: "audio", category: "repair_completion" });
  const damagedPartAttachments = filterAttachments(mergedAttachments, { type: "image", category: "damaged_part_image" });
  const productImageAttachments = filterAttachments(mergedAttachments, { type: "image", category: "product_image" });
  const notRepairableVideoAttachments = filterAttachments(mergedAttachments, { type: "video", category: "not_repairable" });
  const notRepairableAudioAttachments = filterAttachments(mergedAttachments, { type: "audio", category: "not_repairable" });

  return (
    <section className="space-y-6" dir="rtl">
      <Button variant="ghost" asChild>
        <Link to="/maintenance-operations">
          <ArrowRight />
          العودة للعمليات
        </Link>
      </Button>

      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      {details ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">عملية {caseData.caseCode}</h1>
            <Badge variant={isUnrepaired ? "destructive" : "default"}>
              {isUnrepaired ? "لا يمكن إصلاحها" : "تم الإصلاح"}
            </Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>الملخص النهائي</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Info label="العميل" value={details.customer?.name || "غير محدد"} />
              <Info label="الجهاز" value={[details.device?.brand, details.device?.applianceType, details.device?.modelName].filter(Boolean).join(" ") || "غير محدد"} />
              <Info label="الفني" value={details.assignedTechnician?.name || caseData.technicianName || "غير محدد"} />
              <Info label="تاريخ الإنهاء" value={formatDate(caseData.operationFinalizedAt || caseData.executionCompletedAt)} />
              <Info label="العمل المنجز" value={caseData.postRepairCompletedWork || "غير محدد"} />
              <Info label="سبب عدم التمكن من الإصلاح" value={caseData.notRepairableReason || caseData.finalResult || "غير محدد"} />
            </CardContent>
          </Card>

          {isUnrepaired ? (
            <Card>
              <CardHeader>
                <CardTitle>سبب عدم إمكانية إصلاح هذه الحالة</CardTitle>
              </CardHeader>
              <CardContent>
                <Info label="السبب" value={caseData.notRepairableReason || caseData.finalResult || "غير محدد"} />
              </CardContent>
            </Card>
          ) : canViewQualityData ? (
            <Card>
              <CardHeader>
                <CardTitle>فحص الجودة والبيانات المحفوظة</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <Info label="اختبار الجهاز" value={caseData.postRepairTested ? `نعم - ${caseData.postRepairTestCount || 1} مرات` : "لا"} />
                <Info label="تنظيف الجهاز" value={caseData.postRepairCleaned ? "نعم" : "لا"} />
                <Info label="نصائح فنية" value={caseData.postRepairRecommendations || "غير محدد"} />
                <Info label="ملاحظة الفني" value={caseData.postRepairNote || "غير محدد"} />
              </CardContent>
            </Card>
          ) : null}

          {canViewFinalInvoice ? <InvoiceArchive parts={parts} services={services} /> : null}

          {!isUnrepaired && canViewRepairImages ? (
            <MediaSection title="صور الجهاز بعد الإصلاح" attachments={repairImageAttachments} emptyMessage="لا توجد صور محفوظة بعد الإصلاح." />
          ) : null}

          {!isUnrepaired && canViewRepairVideos ? (
            <MediaSection title="فيديو الجهاز بعد الإصلاح" attachments={repairVideoAttachments} emptyMessage="لا توجد فيديوهات محفوظة بعد الإصلاح." />
          ) : null}

          {!isUnrepaired && canViewQualityData ? (
            <MediaSection title="الملاحظات الصوتية بعد الإصلاح" attachments={repairAudioAttachments} emptyMessage="لا توجد ملاحظات صوتية محفوظة بعد الإصلاح." />
          ) : null}

          {!isUnrepaired && canViewDamagedPartImages ? (
            <MediaSection title="القطعة المعطوبة" attachments={damagedPartAttachments} emptyMessage="لا توجد صور للقطعة المعطوبة." />
          ) : null}

          {isUnrepaired && (
            <>
              <MediaSection title="صور المنتج" attachments={productImageAttachments} emptyMessage="لا توجد صور منتج محفوظة." />
              <MediaSection title="صور القطعة التالفة" attachments={damagedPartAttachments} emptyMessage="لا توجد صور للقطعة التالفة." />
              <MediaSection title="الفيديوهات" attachments={notRepairableVideoAttachments} emptyMessage="لا توجد فيديوهات محفوظة." />
              <MediaSection title="الملاحظات الصوتية" attachments={notRepairableAudioAttachments} emptyMessage="لا توجد ملاحظات صوتية محفوظة." />
            </>
          )}
        </>
      ) : null}
    </section>
  );
}

function MediaSection({
  title,
  attachments,
  emptyMessage,
}: {
  title: string;
  attachments: CaseAttachment[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <AttachmentGallery attachments={attachments} emptyMessage={emptyMessage} className={attachments.some((item) => item.type === "image") ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-3"} />
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap font-medium">{value}</p>
    </div>
  );
}

function InvoiceArchive({ parts, services }: { parts: OperationPart[]; services: OperationService[] }) {
  const partsTotal = parts.reduce((sum, part) => sum + toNumber(part.totalPrice), 0);
  const servicesTotal = services.reduce((sum, service) => sum + toNumber(service.totalPrice), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>الفاتورة النهائية</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <h3 className="font-medium">قطع الغيار</h3>
          {parts.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد قطع مسجلة</p>
          ) : (
            parts.map((part) => (
              <div key={part.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-5">
                <Info label="القطعة" value={part.inventoryName || "قطعة"} />
                <Info label="الكود" value={part.inventoryCode || "-"} />
                <Info label="الكمية" value={String(part.quantity)} />
                <Info label="السعر" value={formatMoney(toNumber(part.unitPrice))} />
                <Info label="الإجمالي" value={formatMoney(toNumber(part.totalPrice))} />
              </div>
            ))
          )}
        </div>
        <div className="grid gap-2">
          <h3 className="font-medium">الخدمات</h3>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد خدمات مسجلة</p>
          ) : (
            services.map((service) => (
              <div key={service.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-3">
                <Info label="الخدمة" value={service.serviceName} />
                <Info label="الكمية" value={String(service.quantity)} />
                <Info label="الإجمالي" value={formatMoney(toNumber(service.totalPrice))} />
              </div>
            ))
          )}
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
