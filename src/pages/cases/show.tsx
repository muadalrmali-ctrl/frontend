import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useGetIdentity, useList, useNotification } from "@refinedev/core";
import { useNavigate, useParams } from "react-router";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ImageIcon,
  MessageSquare,
  PackageSearch,
  PauseCircle,
  PlayCircle,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CASE_MEDIA_FILE_BYTES, uploadCaseImageFile } from "@/lib/case-media-upload";
import { apiClient } from "@/providers/api-client";

type CaseDetailsResponse = {
  caseData: CaseData;
  customer: Customer | null;
  device: Device | null;
  history: CaseHistory[];
  waitingPartInventoryItem: InventoryItem | null;
  createdByUser: UserSummary | null;
  assignedTechnician: UserSummary | null;
};

type CaseData = {
  id: number;
  caseCode: string;
  caseType?: string | null;
  status: string;
  customerComplaint: string;
  priority: string;
  technicianName?: string | null;
  serialNumber?: string | null;
  notes?: string | null;
  deliveryDueAt?: string | null;
  executionStartedAt?: string | null;
  executionDueAt?: string | null;
  executionDurationDays?: number;
  executionDurationHours?: number;
  executionTimerStartedAt?: string | null;
  executionTimerPausedAt?: string | null;
  executionTotalPausedSeconds?: number;
  executionCompletedAt?: string | null;
  waitingPartInventoryItemId?: number | null;
  waitingPartName?: string | null;
  waitingPartNotes?: string | null;
  waitingPartImageUrl?: string | null;
  diagnosisNote?: string | null;
  faultCause?: string | null;
  latestMessage?: string | null;
  latestMessageChannel?: string | null;
  latestMessageSentAt?: string | null;
  customerApprovedAt?: string | null;
  customerApprovedBy?: number | null;
  finalResult?: string | null;
  postRepairCompletedWork?: string | null;
  postRepairTested?: boolean;
  postRepairTestCount?: number;
  postRepairCleaned?: boolean;
  postRepairRecommendations?: string | null;
  postRepairImages?: string | null;
  postRepairDamagedPartImages?: string | null;
  postRepairNote?: string | null;
  notRepairableReason?: string | null;
  readyNotificationMessage?: string | null;
  readyNotificationChannel?: string | null;
  readyNotificationSentAt?: string | null;
  customerReceivedAt?: string | null;
  operationFinalizedAt?: string | null;
  assignedTechnicianId?: number | null;
  createdAt?: string | null;
};

type Customer = { id: number; name: string; phone: string; address?: string | null };
type Device = { id: number; applianceType: string; brand: string; modelName: string; modelCode?: string | null; notes?: string | null };
type UserSummary = { id: number; name: string; email: string };
type CurrentUser = UserSummary & { role: string };
type CaseHistory = { id: number; toStatus: string; notes?: string | null; createdAt?: string | null; actorName?: string | null; actorRole?: string | null };
type InventoryItem = { id: number; name: string; code: string; quantity?: number; sellingPrice?: string | null; unitCost?: string | null; imageUrl?: string | null };
type CasePart = {
  id: number;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  handoffStatus?: string;
  deliveredAt?: string | null;
  deliveredBy?: number | null;
  deliveredByName?: string | null;
  receivedAt?: string | null;
  receivedBy?: number | null;
  receivedByName?: string | null;
  returnedAt?: string | null;
  consumedAt?: string | null;
  inventoryName?: string | null;
  inventoryCode?: string | null;
  inventoryImageUrl?: string | null;
};
type CaseService = { id: number; serviceName: string; quantity: number; unitPrice: string; totalPrice: string };
type ReadyMediaOption = {
  id: string;
  label: string;
  imageUrl: string;
  sendable: boolean;
};

const statusLabels: Record<string, string> = {
  received: "حالة جديدة",
  waiting_part: "بانتظار القطعة",
  diagnosing: "قيد التشخيص",
  waiting_approval: "بانتظار موافقة وتسجيل استلام قطعة غيار",
  in_progress: "قيد التنفيذ",
  repaired: "تم الإصلاح",
  not_repairable: "لا يمكن إصلاحها",
};

const caseTypeLabels: Record<string, string> = {
  internal: "داخلية داخل المركز",
  external: "خارجية / موقع العميل",
};

const channelLabels = ["WhatsApp", "Email", "SMS", "other"];
const MAX_INLINE_IMAGE_BYTES = MAX_CASE_MEDIA_FILE_BYTES;

const formatDate = (value?: string | null) => {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
};

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
};
const daysUntil = (dateValue: string) => {
  if (!dateValue) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateValue}T00:00:00`);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
};
const toNumber = (value?: string | null) => {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};
const formatMoney = (value: number) => `${value.toLocaleString("ar-LY")} د.ل`;
const getCaseTypeLabel = (caseType?: string | null) =>
  caseTypeLabels[caseType || "internal"] || caseTypeLabels.internal;
const getPartHandoffLabel = (handoffStatus?: string | null) => {
  switch (handoffStatus) {
    case "requested":
      return "تم طلبها للزيارة الخارجية";
    case "delivered":
      return "تم التسليم";
    case "received":
      return "تم الاستلام";
    case "consumed":
      return "تم الاستخدام";
    case "returned":
      return "تمت الإعادة للمخزن";
    default:
      return "بانتظار الإجراء";
  }
};
const getInvoiceTotals = (parts: CasePart[], services: CaseService[]) => {
  const partsTotal = parts.reduce((sum, part) => sum + toNumber(part.totalPrice), 0);
  const servicesTotal = services.reduce((sum, service) => sum + toNumber(service.totalPrice), 0);
  return { partsTotal, servicesTotal, invoiceTotal: partsTotal + servicesTotal };
};
const getDiagnosisText = (caseData: CaseData) => caseData.diagnosisNote || caseData.faultCause || "";
const buildDiagnosisMessage = (
  details: CaseDetailsResponse,
  estimatedCost: string,
  expectedDelivery: string,
  diagnosisText: string
) => {
  const customerName = details.customer?.name || "العميل";
  const caseCode = details.caseData.caseCode || String(details.caseData.id);
  const deliveryText = expectedDelivery || "غير محدد";
  const estimatedCostText = estimatedCost || "غير محددة";
  return [
    `مرحبًا ${customerName}،`,
    "",
    `بعد فحص طلب الصيانة رقم ${caseCode}، تبين التالي:`,
    `- التشخيص: ${diagnosisText || "لم يتم إدخال التشخيص بعد."}`,
    `- التكلفة التقديرية: ${estimatedCostText}`,
    `- الموعد المتوقع: ${deliveryText}`,
    "",
    "يرجى تأكيد الموافقة للمتابعة.",
  ].join("\n");
};
const buildReadyMessage = (
  customerName: string,
  caseCode: string,
  repairSummary: string,
  finalCost: string,
  pickupNote: string
) => {
  const optionalPickupNote = pickupNote.trim() ? `\n${pickupNote.trim()}` : "";
  return [
    `مرحبًا ${customerName}،`,
    "",
    `نود إفادتكم بأن طلب الصيانة رقم ${caseCode} أصبح جاهزًا.`,
    "",
    `• ملخص الإصلاح: ${repairSummary || "تم إكمال أعمال الصيانة المطلوبة."}`,
    `• التكلفة النهائية: ${finalCost}`,
    "",
    "يمكنكم مراجعة المركز لاستلام الجهاز.",
    optionalPickupNote,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
const getRemainingExecutionSeconds = (caseData: CaseData, now: number) => {
  const startedAt = caseData.executionTimerStartedAt ? new Date(caseData.executionTimerStartedAt).getTime() : null;
  if (!startedAt) return 0;
  const durationSeconds = ((caseData.executionDurationDays || 0) * 86_400) + ((caseData.executionDurationHours || 0) * 3_600);
  const pausedAt = caseData.executionTimerPausedAt ? new Date(caseData.executionTimerPausedAt).getTime() : null;
  const effectiveNow = pausedAt ?? now;
  const elapsedSeconds = Math.max(0, Math.floor((effectiveNow - startedAt) / 1000) - (caseData.executionTotalPausedSeconds || 0));
  return Math.max(0, durationSeconds - elapsedSeconds);
};
const formatDuration = (seconds: number) => {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  return `${days} يوم ${hours} ساعة ${minutes} دقيقة ${remainingSeconds} ثانية`;
};

const formatRemainingTime = (seconds: number) => {
  if (seconds <= 0) return "انتهى الوقت";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.max(1, Math.floor((seconds % 3_600) / 60));

  if (days > 0) return `باقي ${days} ${days === 1 ? "يوم" : "أيام"}`;
  if (hours > 0) return `باقي ${hours} ساعات و ${minutes} دقيقة`;
  return `باقي ${minutes} دقيقة`;
};

const getExecutionElapsedSeconds = (caseData: CaseData) => {
  const startedAt = caseData.executionTimerStartedAt ? new Date(caseData.executionTimerStartedAt) : null;
  const completedAt = caseData.executionCompletedAt ? new Date(caseData.executionCompletedAt) : null;
  if (!startedAt || !completedAt) return 0;

  const pausedSeconds = caseData.executionTotalPausedSeconds || 0;
  return Math.max(0, Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000) - pausedSeconds);
};

const getEstimatedExecutionSeconds = (caseData: CaseData) =>
  ((caseData.executionDurationDays || 0) * 86_400) +
  ((caseData.executionDurationHours || 0) * 3_600);

const getPerformanceIndicator = (actualSeconds: number, estimatedSeconds: number) => {
  if (!actualSeconds || !estimatedSeconds) return { label: "غير محدد", tone: "secondary" as const };
  const delta = actualSeconds - estimatedSeconds;
  const absDelta = Math.abs(delta);
  const minutes = Math.ceil(absDelta / 60);
  const days = Math.floor(absDelta / 86_400);

  if (delta > 0) {
    const delayText = days >= 1 ? `${days} يوم` : `${minutes} دقيقة`;
    return { label: `متأخر ${delayText}`, tone: "destructive" as const };
  }

  if (actualSeconds <= estimatedSeconds * 0.65) {
    return { label: "ممتاز", tone: "default" as const };
  }

  if (actualSeconds <= estimatedSeconds * 0.9) {
    return { label: "جيد جدًا", tone: "default" as const };
  }

  return { label: "جيد", tone: "secondary" as const };
};

const parseImageList = (value?: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const stringifyImageList = (images: string[]) => JSON.stringify(images);
const isPublicMediaUrl = (value: string) => /^https?:\/\//i.test(value.trim());
const isPartReadyForExecution = (part: CasePart) => ["received", "consumed", "returned"].includes(part.handoffStatus || "pending");
const getTimelineLabel = (entry: CaseHistory) => {
  const note = entry.notes || "";
  if (note.includes("Customer approved")) return "موافقة العميل";
  if (note.includes("Part delivered:")) return "تم تسليم القطعة";
  if (note.includes("Part received:")) return "تم استلام القطعة";
  if (entry.toStatus === "in_progress") return "بدء التنفيذ";
  if (entry.toStatus === "repaired") return "اكتمال الإصلاح";
  if (entry.toStatus === "completed") return "إقفال العملية";
  return statusLabels[entry.toStatus] || "حدث على الحالة";
};
const getTimelinePartName = (entry: CaseHistory) => {
  const note = entry.notes || "";
  const parts = note.split(":");
  return parts.length > 1 ? parts.slice(1).join(":").trim() : null;
};

export function CaseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const caseId = Number(id);
  const [details, setDetails] = useState<CaseDetailsResponse | null>(null);
  const [parts, setParts] = useState<CasePart[]>([]);
  const [services, setServices] = useState<CaseService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = async () => {
    if (!caseId || Number.isNaN(caseId)) {
      setError("رقم الحالة غير صالح.");
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      const [caseDetails, caseParts, caseServices] = await Promise.all([
        apiClient<CaseDetailsResponse>(`/api/cases/${caseId}`),
        apiClient<CasePart[]>(`/api/cases/${caseId}/parts`).catch(() => []),
        apiClient<CaseService[]>(`/api/cases/${caseId}/services`).catch(() => []),
      ]);
      setDetails(caseDetails);
      setParts(caseParts);
      setServices(caseServices);
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر تحميل تفاصيل الحالة");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const status = details?.caseData.status ?? "";
  const statusLabel = statusLabels[status] ?? status;

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button type="button" variant="ghost" onClick={() => navigate("/cases")}>
            <ArrowRight />
            العودة إلى الحالات
          </Button>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">تفاصيل الحالة</h1>
            <Badge className="px-3 py-1 text-sm">{statusLabel}</Badge>
            <Badge variant="outline" className="px-3 py-1 text-sm">
              {getCaseTypeLabel(details?.caseData.caseType)}
            </Badge>
          </div>
          <p className="mt-2 text-muted-foreground">صفحة تشغيلية لمتابعة بيانات الحالة والقطع والتشخيص والتنفيذ.</p>
        </div>
        {details && (
          <div className="rounded-lg border bg-card px-4 py-3 text-left">
            <p className="text-sm text-muted-foreground">رقم الحالة</p>
            <p className="text-2xl font-semibold">{details.caseData.caseCode}</p>
          </div>
        )}
      </div>
      {isLoading && <p className="text-muted-foreground">جاري تحميل التفاصيل...</p>}
      {error && <ErrorMessage message={error} />}
      {details && (
        <>
          <BasicCaseInfo details={details} />
          {status === "waiting_part" && <WaitingPartSection details={details} onSaved={loadDetails} />}
          {status === "diagnosing" && <DiagnosisInvoiceSection details={details} parts={parts} services={services} onSaved={loadDetails} />}
          {status === "waiting_approval" && <WaitingApprovalAndHandoffSection details={details} parts={parts} services={services} onSaved={loadDetails} />}
          {status === "in_progress" && <ExecutionSection details={details} parts={parts} services={services} onSaved={loadDetails} />}
          {status === "repaired" && <RepairedSection details={details} parts={parts} services={services} onSaved={loadDetails} />}
          {status === "not_repairable" && <NotRepairableSection details={details} onSaved={loadDetails} />}
          <CaseActivityTimeline history={details.history} />
        </>
      )}
    </section>
  );
}

function BasicCaseInfo({ details }: { details: CaseDetailsResponse }) {
  const latestHistory = details.history[details.history.length - 1];
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="rounded-lg">
        <CardHeader><CardTitle>المعلومات الأساسية</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Info label="حالة الحالة / الأولوية" value={details.caseData.priority || "متوسطة"} />
          <Info label="نوع الحالة" value={getCaseTypeLabel(details.caseData.caseType)} />
          <Info label="تاريخ الإنشاء" value={formatDate(details.caseData.createdAt)} />
          <Info label="رقم الحالة" value={details.caseData.caseCode} />
          <Info label="أنشأها من" value={details.createdByUser?.name || "غير محدد"} />
          <Info label="الفني المسؤول" value={details.assignedTechnician?.name || details.caseData.technicianName || "غير معين"} />
          <Info label="آخر رسالة" value={details.caseData.latestMessage || latestHistory?.notes || "لا توجد رسالة"} />
          <Info label="سبب الخطأ" value={getDiagnosisText(details.caseData) || "لم يحدد بعد"} />
          <Info label="وصف الخطأ" value={details.caseData.customerComplaint} />
        </CardContent>
      </Card>
      <div className="grid gap-6">
        <Card className="rounded-lg">
          <CardHeader><CardTitle>بيانات العميل</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <Info label="الاسم" value={details.customer?.name || "غير محدد"} />
            <Info label="الهاتف" value={details.customer?.phone || "غير محدد"} />
            <Info label="العنوان" value={details.customer?.address || "غير محدد"} />
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader><CardTitle>بيانات الجهاز</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <Info label="نوع الجهاز" value={details.device?.applianceType || "غير محدد"} />
            <Info label="الماركة" value={details.device?.brand || "غير محدد"} />
            <Info label="الموديل" value={details.device?.modelName || "غير محدد"} />
            <Info label="الكود" value={details.device?.modelCode || "غير محدد"} />
            <Info label="الرقم التسلسلي" value={details.caseData.serialNumber || "غير محدد"} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CaseActivityTimeline({ history }: { history: CaseHistory[] }) {
  if (!history.length) {
    return null;
  }

  const orderedHistory = [...history].sort(
    (left, right) =>
      new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
  );

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>سجل النشاط</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {orderedHistory.map((entry) => {
          const partName = getTimelinePartName(entry);
          return (
            <div key={entry.id} className="rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold">{getTimelineLabel(entry)}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.actorName || "مستخدم النظام"} • {formatDate(entry.createdAt)}
                  </p>
                </div>
                {partName && (
                  <Badge variant="outline" className="w-fit">
                    {partName}
                  </Badge>
                )}
              </div>
              {entry.notes && !partName && (
                <p className="mt-2 text-sm text-muted-foreground">{entry.notes}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function WaitingPartSection({ details, onSaved }: { details: CaseDetailsResponse; onSaved: () => Promise<void> }) {
  const { result } = useList<InventoryItem>({ resource: "inventory" });
  const inventoryItems = result.data ?? [];
  const [selectedItemId, setSelectedItemId] = useState(details.caseData.waitingPartInventoryItemId ? String(details.caseData.waitingPartInventoryItemId) : "manual");
  const [manualName, setManualName] = useState(details.caseData.waitingPartName ?? "");
  const [notes, setNotes] = useState(details.caseData.waitingPartNotes ?? "");
  const [imageUrl, setImageUrl] = useState(details.caseData.waitingPartImageUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const selectedItem = inventoryItems.find((item) => String(item.id) === selectedItemId);
  const previewImageUrl = selectedItem?.imageUrl ?? imageUrl;

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_INLINE_IMAGE_BYTES) {
      setError("الصورة كبيرة حاليا. استخدم صورة أصغر أو رابط صورة حتى يتم ربط التخزين الخارجي.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(String(reader.result || ""));
      setError(null);
    };
    reader.onerror = () => setError("تعذر قراءة الصورة من الجهاز.");
    reader.readAsDataURL(file);
  };

  const handleSupabaseImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    uploadCaseImageFile({
      caseId: details.caseData.id,
      mediaCategory: "waiting_part",
      file,
    })
      .then((uploadedMedia) => {
        setImageUrl(uploadedMedia.publicUrl);
        setError(null);
      })
      .catch((error) => {
        setError(error instanceof Error ? error.message : "ØªØ¹Ø°Ø± Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±Ø© Ù…Ù† Ø§Ù„Ø¬Ù‡Ø§Ø².");
      });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}`, {
        method: "PATCH",
        body: {
          waitingPartInventoryItemId: selectedItemId === "manual" ? null : Number(selectedItemId),
          waitingPartName: selectedItemId === "manual" ? manualName : selectedItem?.name,
          waitingPartNotes: notes,
          waitingPartImageUrl: previewImageUrl || null,
        },
      });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر حفظ القطعة المنتظرة");
    }
  };

  return (
    <Card className="rounded-lg">
      <CardHeader><CardTitle className="flex items-center gap-2"><PackageSearch /> القطعة المنتظرة</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="اختيار من المخزون">
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">إدخال يدوي</SelectItem>
                {inventoryItems.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name} - {item.code}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {selectedItem ? (
            <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-[180px_1fr]">
              <ImageBox imageUrl={selectedItem.imageUrl} label={selectedItem.name} />
              <div className="grid content-center gap-2">
                <p className="text-lg font-semibold">{selectedItem.name}</p>
                <p className="text-sm text-muted-foreground">{selectedItem.code}</p>
              </div>
            </div>
          ) : (
            <Field label="اسم / وصف القطعة"><Input value={manualName} onChange={(event) => setManualName(event.target.value)} /></Field>
          )}
          <div className="grid gap-4 rounded-lg border bg-muted/10 p-4 md:grid-cols-[220px_1fr]">
            <ImageBox imageUrl={previewImageUrl} label={selectedItem?.name || manualName || "صورة القطعة"} />
            <div className="grid content-center gap-3">
              <Field label="رفع صورة من الجهاز"><Input type="file" accept="image/*" onChange={handleSupabaseImageUpload} /></Field>
              <Field label="أو رابط صورة اختياري"><Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></Field>
              <p className="text-sm text-muted-foreground">التخزين الحالي يحفظ صورة صغيرة أو رابط صورة. يمكن ربطه لاحقا بتخزين خارجي بدون تغيير شكل البيانات.</p>
            </div>
          </div>
          <Field label="ملاحظات"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
          {error && <ErrorMessage message={error} />}
          <Button type="submit" className="w-fit">حفظ القطعة المنتظرة</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DiagnosisInvoiceSection({ details, parts, services, onSaved }: { details: CaseDetailsResponse; parts: CasePart[]; services: CaseService[]; onSaved: () => Promise<void> }) {
  const { open } = useNotification();
  const { result } = useList<InventoryItem>({ resource: "inventory" });
  const inventoryItems = result.data ?? [];
  const initialDate = details.caseData.deliveryDueAt ? details.caseData.deliveryDueAt.slice(0, 10) : addDays(3);
  const [deliveryDate, setDeliveryDate] = useState(initialDate);
  const [deliveryDays, setDeliveryDays] = useState(String(daysUntil(initialDate)));
  const [diagnosisText, setDiagnosisText] = useState(getDiagnosisText(details.caseData));
  const [selectedPartId, setSelectedPartId] = useState("");
  const [partQuantity, setPartQuantity] = useState("1");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [isDiagnosisDialogOpen, setIsDiagnosisDialogOpen] = useState(false);
  const [messageDiagnosisText, setMessageDiagnosisText] = useState(getDiagnosisText(details.caseData));
  const [messageEstimatedCost, setMessageEstimatedCost] = useState(formatMoney(getInvoiceTotals(parts, services).invoiceTotal));
  const [messageExpectedDelivery, setMessageExpectedDelivery] = useState(initialDate);
  const [messageText, setMessageText] = useState("");
  const [isMessageDirty, setIsMessageDirty] = useState(false);
  const [isSendingDiagnosis, setIsSendingDiagnosis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { invoiceTotal } = getInvoiceTotals(parts, services);
  const selectedPart = inventoryItems.find((item) => String(item.id) === selectedPartId);
  const generatedMessage = useMemo(
    () =>
      buildDiagnosisMessage(
        details,
        messageEstimatedCost,
        messageExpectedDelivery,
        messageDiagnosisText
      ),
    [details, messageDiagnosisText, messageEstimatedCost, messageExpectedDelivery]
  );

  useEffect(() => {
    if (!isMessageDirty) setMessageText(generatedMessage);
  }, [generatedMessage, isMessageDirty]);

  useEffect(() => {
    if (!isDiagnosisDialogOpen) return;

    setMessageDiagnosisText(diagnosisText);
    setMessageEstimatedCost(formatMoney(invoiceTotal));
    setMessageExpectedDelivery(deliveryDate);
    setIsMessageDirty(false);
  }, [deliveryDate, diagnosisText, invoiceTotal, isDiagnosisDialogOpen]);

  const handleDateChange = (value: string) => {
    setDeliveryDate(value);
    setDeliveryDays(String(daysUntil(value)));
  };
  const handleDaysChange = (value: string) => {
    const safeDays = Math.max(0, Number(value || 0));
    setDeliveryDays(String(safeDays));
    setDeliveryDate(addDays(safeDays));
  };
  const expectedDeliveryAt = useMemo(() => new Date(`${deliveryDate}T12:00:00`).toISOString(), [deliveryDate]);
  const messageExpectedDeliveryAt = useMemo(() => {
    if (!messageExpectedDelivery) return null;
    return new Date(`${messageExpectedDelivery}T12:00:00`).toISOString();
  }, [messageExpectedDelivery]);

  const persistDiagnosis = async () => {
    await apiClient(`/api/cases/${details.caseData.id}`, {
      method: "PATCH",
      body: { diagnosisNote: diagnosisText, faultCause: diagnosisText, deliveryDueAt: expectedDeliveryAt },
    });
  };
  const saveDiagnosis = async () => {
    setError(null);
    try {
      await persistDiagnosis();
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر حفظ التشخيص");
    }
  };
  const handleAddPart = async () => {
    if (!selectedPartId) return;
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/parts`, {
        method: "POST",
        body: { inventoryItemId: Number(selectedPartId), quantity: Number(partQuantity || 1) },
      });
      setSelectedPartId("");
      setPartQuantity("1");
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر إضافة القطعة");
    }
  };
  const handleAddService = async () => {
    if (!serviceName.trim() || !servicePrice) return;
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/services`, {
        method: "POST",
        body: { serviceName, unitPrice: Number(servicePrice), quantity: 1 },
      });
      setServiceName("");
      setServicePrice("");
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر إضافة الخدمة");
    }
  };
  const handleSendMessage = async () => {
    const customerName = details.customer?.name?.trim() || "";
    const customerPhone = details.customer?.phone?.trim() || "";
    const normalizedDiagnosis = messageDiagnosisText.trim();

    if (!customerName) {
      setError("اسم العميل غير متوفر في بيانات الحالة.");
      return;
    }

    if (!customerPhone) {
      setError("رقم هاتف العميل مطلوب قبل إرسال رسالة التشخيص.");
      return;
    }

    if (!normalizedDiagnosis) {
      setError("يرجى إدخال التشخيص قبل إرسال الرسالة.");
      return;
    }

    setError(null);
    setIsSendingDiagnosis(true);
    try {
      await apiClient(`/api/cases/${details.caseData.id}`, {
        method: "PATCH",
        body: {
          diagnosisNote: normalizedDiagnosis,
          faultCause: normalizedDiagnosis,
          deliveryDueAt: messageExpectedDeliveryAt,
        },
      });

      const finalMessage = messageText || generatedMessage;

      await apiClient(`/api/cases/${details.caseData.id}`, {
        method: "PATCH",
        body: {
          latestMessage: finalMessage,
          latestMessageChannel: "WhatsApp",
          latestMessageSentAt: new Date().toISOString(),
        },
      });

      await apiClient(`/api/notifications/send-customer-message`, {
        method: "POST",
        body: {
          caseId: details.caseData.caseCode || String(details.caseData.id),
          customerName,
          customerPhone,
          messageBody: finalMessage,
          channel: "whatsapp",
          type: "diagnosis",
        },
      });

      if (details.caseData.status !== "waiting_approval") {
        await apiClient(`/api/cases/${details.caseData.id}/status`, {
          method: "PATCH",
          body: { toStatus: "waiting_approval", notes: "Diagnosis approval message sent to customer via notifications workflow." },
        });
      }
      open?.({
        type: "success",
        message: "تم إرسال الرسالة",
        description: "تم إرسال رسالة التشخيص للعميل ونقل الحالة إلى بانتظار الموافقة.",
      });
      setIsDiagnosisDialogOpen(false);
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر تجهيز الرسالة");
    } finally {
      setIsSendingDiagnosis(false);
    }
  };

  return (
    <Card className="rounded-lg">
      <CardHeader><CardTitle>التشخيص والفاتورة</CardTitle></CardHeader>
      <CardContent className="grid gap-6">
        {error && <ErrorMessage message={error} />}
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="عدد الأيام المتوقع بعد الموافقة"><Input type="number" min="0" value={deliveryDays} onChange={(event) => handleDaysChange(event.target.value)} /></Field>
          <Field label="أو اختر تاريخا مباشرا"><Input type="date" value={deliveryDate} onChange={(event) => handleDateChange(event.target.value)} /></Field>
          <div className="flex items-end"><Button type="button" onClick={saveDiagnosis}>حفظ التشخيص</Button></div>
        </div>
        <Field label="ملاحظة / سبب العطل"><Textarea value={diagnosisText} onChange={(event) => setDiagnosisText(event.target.value)} className="min-h-32" /></Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-lg">إضافة قطعة</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="اختر قطعة من المخزون" /></SelectTrigger>
                <SelectContent>{inventoryItems.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name} - {item.code}</SelectItem>)}</SelectContent>
              </Select>
              {selectedPart && <div className="flex items-center gap-3 rounded-lg border p-3"><ImageBox imageUrl={selectedPart.imageUrl} label={selectedPart.name} small /><div><p className="font-medium">{selectedPart.name}</p><p className="text-sm text-muted-foreground">{selectedPart.code}</p></div></div>}
              <Input type="number" min="1" value={partQuantity} onChange={(event) => setPartQuantity(event.target.value)} />
              <Button type="button" onClick={handleAddPart}><Plus /> إضافة قطعة</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">إضافة خدمة</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="صيانة / فحص / عمل يد / قبض" />
              <Input type="number" min="0" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} placeholder="السعر" />
              <Button type="button" onClick={handleAddService}><Plus /> إضافة خدمة</Button>
            </CardContent>
          </Card>
        </div>
        <InvoicePreview parts={parts} services={services} />
        <div className="grid gap-4 rounded-lg border p-4">
          <div className="flex items-center gap-2"><MessageSquare className="size-5" /><h3 className="text-lg font-semibold">إرسال التشخيص للعميل</h3></div>
          <p className="text-sm text-muted-foreground">
            راجع التشخيص والتكلفة المتوقعة والموعد المتوقع ثم أرسل الرسالة عبر WhatsApp من خلال تكامل الباكند مع n8n.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" className="w-fit" onClick={() => setIsDiagnosisDialogOpen(true)}>
              <Send />
              Send Diagnosis
            </Button>
          </div>
        </div>
        <Dialog open={isDiagnosisDialogOpen} onOpenChange={setIsDiagnosisDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>إرسال التشخيص</DialogTitle>
              <DialogDescription>
                راجع الرسالة النهائية قبل الإرسال. سيتم إرسالها من الباكند إلى n8n ثم إلى WhatsApp.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="اسم العميل">
                  <Input value={details.customer?.name || ""} readOnly />
                </Field>
                <Field label="رقم الهاتف">
                  <Input value={details.customer?.phone || ""} readOnly dir="ltr" />
                </Field>
                <Field label="رقم الحالة">
                  <Input value={details.caseData.caseCode || String(details.caseData.id)} readOnly dir="ltr" />
                </Field>
                <Field label="الموعد المتوقع">
                  <Input
                    type="date"
                    value={messageExpectedDelivery}
                    onChange={(event) => setMessageExpectedDelivery(event.target.value)}
                  />
                </Field>
              </div>
              <Field label="التشخيص">
                <Textarea
                  value={messageDiagnosisText}
                  onChange={(event) => setMessageDiagnosisText(event.target.value)}
                  className="min-h-28"
                />
              </Field>
              <Field label="التكلفة التقديرية">
                <Input
                  value={messageEstimatedCost}
                  onChange={(event) => setMessageEstimatedCost(event.target.value)}
                  placeholder="مثال: 150 د.ل"
                />
              </Field>
              <Field label="معاينة الرسالة النهائية">
                <Textarea
                  value={messageText}
                  onChange={(event) => {
                    setMessageText(event.target.value);
                    setIsMessageDirty(true);
                  }}
                  className="min-h-56"
                />
              </Field>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMessageText(generatedMessage);
                  setIsMessageDirty(false);
                }}
              >
                تحديث المعاينة
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDiagnosisDialogOpen(false)}
                disabled={isSendingDiagnosis}
              >
                إلغاء
              </Button>
              <Button type="button" onClick={handleSendMessage} disabled={isSendingDiagnosis}>
                <Send />
                {isSendingDiagnosis ? "جاري الإرسال..." : "إرسال التشخيص"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function WaitingApprovalSection({ details, parts, services, onSaved }: { details: CaseDetailsResponse; parts: CasePart[]; services: CaseService[]; onSaved: () => Promise<void> }) {
  const { open } = useNotification();
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [showExecutionPrep, setShowExecutionPrep] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { invoiceTotal } = getInvoiceTotals(parts, services);
  const rejectionReason = "Customer rejected repair after diagnosis";

  const resendMessage = async () => {
    setError(null);
    try {
      const message =
        details.caseData.latestMessage ||
        buildDiagnosisMessage(
          details,
          formatMoney(invoiceTotal),
          "غير محدد",
          getDiagnosisText(details.caseData)
        );
      await apiClient(`/api/cases/${details.caseData.id}`, {
        method: "PATCH",
        body: {
          latestMessage: message,
          latestMessageChannel: details.caseData.latestMessageChannel || "WhatsApp",
          latestMessageSentAt: new Date().toISOString(),
        },
      });
      open?.({ type: "success", message: "تم إرسال الرسالة", description: "تم تحديث رسالة الموافقة للعميل." });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر إعادة الإرسال");
    }
  };

  const rejectDiagnosis = async () => {
    setError(null);
    setIsRejecting(true);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/status`, {
        method: "PATCH",
        body: {
          toStatus: "not_repairable",
          notes: rejectionReason,
          finalResult: rejectionReason,
        },
      });
      open?.({
        type: "success",
        message: "تم تسجيل الرفض",
        description: "تم نقل الحالة إلى لا يمكن إصلاحها بعد رفض العميل المتابعة.",
      });
      setIsRejectDialogOpen(false);
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر تسجيل رفض العميل");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card className="rounded-lg">
        <CardHeader><CardTitle>الفاتورة المرسلة للعميل</CardTitle></CardHeader>
        <CardContent className="grid gap-5">
          {error && <ErrorMessage message={error} />}
          <InvoicePreview parts={parts} services={services} />
          <Info label="آخر رسالة مرسلة" value={details.caseData.latestMessage || "لم يتم حفظ رسالة بعد"} />
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setIsEditingInvoice((value) => !value)}>تعديل الفاتورة</Button>
            <Button type="button" variant="outline" onClick={resendMessage}><RotateCcw /> إعادة الإرسال</Button>
            <Button type="button" variant="outline" onClick={() => setIsRejectDialogOpen(true)}>رفض العميل</Button>
            <Button type="button" onClick={() => setShowExecutionPrep(true)}><CheckCircle2 /> تمت الموافقة</Button>
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد رفض العميل</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم نقل الحالة إلى "لا يمكن إصلاحها" باستخدام سبب افتراضي: "Customer rejected repair after diagnosis".
              يمكن تعديل السبب لاحقًا من تفاصيل الحالة قبل إنهاء العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRejecting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={rejectDiagnosis} disabled={isRejecting}>
              {isRejecting ? "جارٍ التنفيذ..." : "تأكيد الرفض"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {isEditingInvoice && <DiagnosisInvoiceSection details={details} parts={parts} services={services} onSaved={onSaved} />}
      {showExecutionPrep && <ExecutionPreparationSection details={details} onSaved={onSaved} />}
    </div>
  );
}

function WaitingApprovalAndHandoffSection({ details, parts, services, onSaved }: { details: CaseDetailsResponse; parts: CasePart[]; services: CaseService[]; onSaved: () => Promise<void> }) {
  const { open } = useNotification();
  const { data: currentUser } = useGetIdentity<CurrentUser>();
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [pendingPartActionId, setPendingPartActionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { invoiceTotal } = getInvoiceTotals(parts, services);
  const rejectionReason = "Customer rejected repair after diagnosis";
  const isExternalCase = details.caseData.caseType === "external";
  const approvalConfirmed = Boolean(details.caseData.customerApprovedAt);
  const hasCaseParts = parts.length > 0;
  const allPartsReceived = parts.every(isPartReadyForExecution);
  const canStartExecution = approvalConfirmed && (!hasCaseParts || allPartsReceived);
  const canDeliver = currentUser?.role === "store_manager" || currentUser?.role === "admin";
  const canReceive =
    currentUser?.role === "technician" ||
    currentUser?.role === "technician_manager" ||
    currentUser?.role === "admin";

  const resendMessage = async () => {
    setError(null);
    try {
      const message =
        details.caseData.latestMessage ||
        buildDiagnosisMessage(details, formatMoney(invoiceTotal), "غير محدد", getDiagnosisText(details.caseData));
      await apiClient(`/api/cases/${details.caseData.id}`, {
        method: "PATCH",
        body: {
          latestMessage: message,
          latestMessageChannel: details.caseData.latestMessageChannel || "WhatsApp",
          latestMessageSentAt: new Date().toISOString(),
        },
      });
      open?.({ type: "success", message: "تم إرسال الرسالة", description: "تم تحديث رسالة الموافقة للعميل." });
      await onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر إعادة الإرسال");
    }
  };

  const rejectDiagnosis = async () => {
    setError(null);
    setIsRejecting(true);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/status`, {
        method: "PATCH",
        body: {
          toStatus: "not_repairable",
          notes: rejectionReason,
          finalResult: rejectionReason,
        },
      });
      open?.({
        type: "success",
        message: "تم تسجيل الرفض",
        description: "تم نقل الحالة إلى لا يمكن إصلاحها بعد رفض العميل المتابعة.",
      });
      setIsRejectDialogOpen(false);
      await onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تسجيل رفض العميل");
    } finally {
      setIsRejecting(false);
    }
  };

  const confirmApproval = async () => {
    setError(null);
    setIsApproving(true);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/approval/confirm`, {
        method: "PATCH",
      });
      open?.({
        type: "success",
        message: "تم تسجيل الموافقة",
        description: "تم تثبيت موافقة العميل وفتح مرحلة تسليم القطعة.",
      });
      await onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تسجيل الموافقة");
    } finally {
      setIsApproving(false);
    }
  };

  const handlePartAction = async (
    partId: number,
    action: "request" | "deliver" | "receive" | "use" | "return"
  ) => {
    setError(null);
    setPendingPartActionId(partId);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/parts/${partId}/${action}`, {
        method: "PATCH",
      });
      const actionMessages = {
        request: {
          message: "تم طلب القطعة",
          description: "تم تسجيل القطعة كطلب زيارة خارجية بانتظار التسليم من المخزن.",
        },
        deliver: {
          message: "تم التسليم",
          description: isExternalCase
            ? "تم نقل القطعة من المخزن إلى عهدة الفني للحالة الخارجية."
            : "تم نقل القطعة من المخزن إلى الحالة.",
        },
        receive: {
          message: "تم الاستلام",
          description: isExternalCase
            ? "تم تأكيد استلام الفني للقطعة ضمن عهدة الزيارة الخارجية."
            : "تم تأكيد استلام الفني للقطعة.",
        },
        use: {
          message: "تم استخدام القطعة",
          description: "تم تسجيل القطعة كمستخدمة فعلياً في الصيانة الخارجية.",
        },
        return: {
          message: "تمت إعادة القطعة",
          description: "تمت إعادة القطعة من عهدة الفني إلى المخزن.",
        },
      } as const;
      open?.({
        type: "success",
        message: actionMessages[action].message,
        description: actionMessages[action].description,
      });
      await onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تحديث حالة القطعة");
    } finally {
      setPendingPartActionId(null);
    }
  };

  return (
    <div className="grid gap-6">
      <Card className="rounded-lg">
        <CardHeader><CardTitle>الفاتورة والموافقة</CardTitle></CardHeader>
        <CardContent className="grid gap-5">
          {error && <ErrorMessage message={error} />}
          <InvoicePreview parts={parts} services={services} />
          <Info label="آخر رسالة مرسلة" value={details.caseData.latestMessage || "لم يتم حفظ رسالة بعد"} />
          <Info
            label="حالة موافقة العميل"
            value={approvalConfirmed ? `تمت الموافقة في ${formatDate(details.caseData.customerApprovedAt)}` : "بانتظار موافقة العميل"}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setIsEditingInvoice((value) => !value)}>تعديل الفاتورة</Button>
            <Button type="button" variant="outline" onClick={resendMessage}><RotateCcw /> إعادة الإرسال</Button>
            <Button type="button" variant="outline" onClick={() => setIsRejectDialogOpen(true)}>رفض العميل</Button>
            <Button type="button" onClick={confirmApproval} disabled={approvalConfirmed || isApproving}>
              <CheckCircle2 />
              {approvalConfirmed ? "تمت الموافقة" : isApproving ? "جارٍ الحفظ..." : "تمت الموافقة"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد رفض العميل</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم نقل الحالة إلى "لا يمكن إصلاحها" باستخدام سبب افتراضي: "Customer rejected repair after diagnosis".
              يمكن تعديل السبب لاحقاً من تفاصيل الحالة قبل إنهاء العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRejecting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={rejectDiagnosis} disabled={isRejecting}>
              {isRejecting ? "جارٍ التنفيذ..." : "تأكيد الرفض"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {isEditingInvoice && <DiagnosisInvoiceSection details={details} parts={parts} services={services} onSaved={onSaved} />}
      {(approvalConfirmed || isExternalCase) && (
        <Card className="rounded-lg border-primary/20">
          <CardHeader>
            <CardTitle>{isExternalCase ? "عهدة القطع للحالة الخارجية" : "تسليم القطع واستلامها"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              {isExternalCase
                ? "في الحالات الخارجية يمكن طلب القطعة قبل الموافقة النهائية، ثم تسليمها إلى عهدة الفني، وبعد الزيارة يمكن تسجيل استخدامها أو إعادتها للمخزن. يبدأ التنفيذ الحالي بعد الموافقة عندما تصبح حالة القطع جاهزة."
                : "بعد موافقة العميل، يسجل مسؤول المخزن تسليم القطع للحالة ثم يؤكد الفني الاستلام. أول ما تكتمل هذه الخطوة سيظهر نموذج بدء التنفيذ الحالي."}
            </p>
            {isExternalCase && !approvalConfirmed && (
              <div className="rounded-xl border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
                هذه حالة خارجية، لذلك يمكن تحريك القطع إلى عهدة الفني قبل تسجيل موافقة العميل النهائية، مع بقاء التنفيذ نفسه مرتبطاً بخطوة الموافقة الحالية.
              </div>
            )}
            {parts.length === 0 ? (
              <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                {isExternalCase
                  ? "لا توجد قطع مرتبطة بالحالة الخارجية حالياً. يمكن إضافة قطعة من الفاتورة أو من تعديل التنفيذ ثم متابعتها ضمن عهدة الفني عند الحاجة."
                  : "لا توجد قطع مرتبطة بالفاتورة حالياً، ويمكن الانتقال مباشرة إلى تجهيز التنفيذ."}
              </div>
            ) : (
              parts.map((part) => (
                <div key={part.id} className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold">{part.inventoryName || "قطعة غير مسماة"}</p>
                      <p className="text-sm text-muted-foreground">
                        الكمية: {part.quantity} • الكود: {part.inventoryCode || "-"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        الحالة: {getPartHandoffLabel(part.handoffStatus)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isExternalCase && canReceive && part.handoffStatus === "pending" && (
                        <Button type="button" variant="outline" onClick={() => handlePartAction(part.id, "request")} disabled={pendingPartActionId === part.id}>
                          طلب القطعة
                        </Button>
                      )}
                      {isExternalCase && canDeliver && part.handoffStatus === "requested" && (
                        <Button type="button" onClick={() => handlePartAction(part.id, "deliver")} disabled={pendingPartActionId === part.id}>
                          تم التسليم
                        </Button>
                      )}
                      {!isExternalCase && canDeliver && part.handoffStatus === "pending" && (
                        <Button type="button" onClick={() => handlePartAction(part.id, "deliver")} disabled={pendingPartActionId === part.id}>
                          تم التسليم
                        </Button>
                      )}
                      {canReceive && part.handoffStatus === "delivered" && (
                        <Button type="button" variant="secondary" onClick={() => handlePartAction(part.id, "receive")} disabled={pendingPartActionId === part.id}>
                          تم الاستلام
                        </Button>
                      )}
                      {isExternalCase && canReceive && part.handoffStatus === "received" && (
                        <>
                          <Button type="button" variant="secondary" onClick={() => handlePartAction(part.id, "use")} disabled={pendingPartActionId === part.id}>
                            تم الاستخدام
                          </Button>
                          <Button type="button" variant="outline" onClick={() => handlePartAction(part.id, "return")} disabled={pendingPartActionId === part.id}>
                            تمت الإعادة
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <Info label="بيان التسليم" value={part.deliveredAt ? `${part.deliveredByName || "مسؤول المخزن"} • ${formatDate(part.deliveredAt)}` : "لم يتم التسليم بعد"} />
                    <Info label="بيان الاستلام" value={part.receivedAt ? `${part.receivedByName || "الفني"} • ${formatDate(part.receivedAt)}` : "لم يتم الاستلام بعد"} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
      {canStartExecution && <ExecutionPreparationSection details={details} onSaved={onSaved} />}
    </div>
  );
}

function ExecutionPreparationSection({ details, onSaved }: { details: CaseDetailsResponse; onSaved: () => Promise<void> }) {
  const { open } = useNotification();
  const { result } = useList<UserSummary>({ resource: "technicians" });
  const technicians = result.data ?? [];
  const [durationDays, setDurationDays] = useState("0");
  const [durationHours, setDurationHours] = useState("4");
  const [technicianId, setTechnicianId] = useState(details.caseData.assignedTechnicianId ? String(details.caseData.assignedTechnicianId) : "");
  const [error, setError] = useState<string | null>(null);

  const startExecution = async () => {
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/execution/start`, {
        method: "PATCH",
        body: {
          durationDays: Number(durationDays || 0),
          durationHours: Number(durationHours || 0),
          customerApprovalConfirmed: true,
          assignedTechnicianId: technicianId ? Number(technicianId) : undefined,
          notes: "Execution prepared after customer approval",
        },
      });
      open?.({ type: "success", message: "تم بدء التنفيذ", description: "تم نقل الحالة إلى قيد التنفيذ." });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر بدء التنفيذ");
    }
  };

  return (
    <Card className="rounded-lg border-primary/30">
      <CardHeader><CardTitle className="flex items-center gap-2"><Wrench /> تجهيز بدء التنفيذ</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-4">
        <Field label="أيام التنفيذ"><Input type="number" min="0" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} /></Field>
        <Field label="ساعات التنفيذ"><Input type="number" min="0" max="23" value={durationHours} onChange={(event) => setDurationHours(event.target.value)} /></Field>
        <Field label="الفني المسؤول">
          <Select value={technicianId || "none"} onValueChange={(value) => setTechnicianId(value === "none" ? "" : value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون تغيير</SelectItem>
              {technicians.map((technician) => <SelectItem key={technician.id} value={String(technician.id)}>{technician.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-end"><Button type="button" onClick={startExecution}><PlayCircle /> بدء التنفيذ</Button></div>
        {error && <div className="md:col-span-4"><ErrorMessage message={error} /></div>}
      </CardContent>
    </Card>
  );
}

function ExecutionSection({ details, parts, services, onSaved }: { details: CaseDetailsResponse; parts: CasePart[]; services: CaseService[]; onSaved: () => Promise<void> }) {
  const { open } = useNotification();
  const [now, setNow] = useState(Date.now());
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remainingSeconds = getRemainingExecutionSeconds(details.caseData, now);
  const isPaused = Boolean(details.caseData.executionTimerPausedAt);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const pauseForApproval = async (notes = "Execution paused after editing started") => {
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/execution/pause`, {
        method: "PATCH",
        body: {
          latestMessageChannel: details.caseData.latestMessageChannel || "WhatsApp",
          notes,
        },
      });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر إيقاف المؤقت مؤقتا");
    }
  };
  const openEditPanel = async () => {
    setIsEditingInvoice(true);
    if (!isPaused) {
      await pauseForApproval("Execution paused for invoice/details edit");
    }
  };
  const resumeExecution = async () => {
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/execution/resume`, {
        method: "PATCH",
        body: { notes: "Customer approved updated execution details" },
      });
      open?.({ type: "success", message: "تم الاستئناف", description: "تم استئناف عداد التنفيذ." });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر استئناف التنفيذ");
    }
  };
  const completeRepair = async () => {
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/execution/complete`, {
        method: "PATCH",
        body: { notes: "Repair completed" },
      });
      open?.({ type: "success", message: "تم الإصلاح", description: "تم نقل الحالة إلى تم الإصلاح." });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر نقل الحالة إلى تم الإصلاح");
    }
  };

  return (
    <div className="grid gap-6">
      <Card className="rounded-lg">
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 /> متابعة التنفيذ</CardTitle></CardHeader>
        <CardContent className="grid gap-5">
          {error && <ErrorMessage message={error} />}
          <div className="grid gap-3 md:grid-cols-4">
            <Info label="موعد التسليم المتوقع" value={formatDate(details.caseData.executionDueAt || details.caseData.deliveryDueAt)} />
            <Info label="مدة التنفيذ المخططة" value={`${details.caseData.executionDurationDays || 0} يوم / ${details.caseData.executionDurationHours || 0} ساعة`} />
            <Info label="حالة المؤقت" value={isPaused ? "متوقف بانتظار موافقة" : "يعمل"} />
            <Info label="الوقت المتبقي للفني" value={formatRemainingTime(remainingSeconds)} />
          </div>
          <InvoicePreview parts={parts} services={services} />
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={openEditPanel}>تعديل</Button>
            <Button type="button" variant="outline" onClick={openEditPanel}><PauseCircle /> إعادة إرسال</Button>
            <Button type="button" variant="outline" onClick={resumeExecution} disabled={!isPaused}><PlayCircle /> تمت الموافقة</Button>
            <Button type="button" onClick={completeRepair}><CheckCircle2 /> تم الإصلاح</Button>
          </div>
        </CardContent>
      </Card>
      {isEditingInvoice && <ExecutionEditSection details={details} parts={parts} services={services} onSaved={onSaved} />}
    </div>
  );
}

function ExecutionEditSection({ details, parts, services, onSaved }: { details: CaseDetailsResponse; parts: CasePart[]; services: CaseService[]; onSaved: () => Promise<void> }) {
  const { open } = useNotification();
  const { result } = useList<InventoryItem>({ resource: "inventory" });
  const inventoryItems = result.data ?? [];
  const initialDate = details.caseData.executionDueAt?.slice(0, 10) || details.caseData.deliveryDueAt?.slice(0, 10) || addDays(1);
  const [deliveryDate, setDeliveryDate] = useState(initialDate);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [partQuantity, setPartQuantity] = useState("1");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [channel, setChannel] = useState(details.caseData.latestMessageChannel || "WhatsApp");
  const [messageText, setMessageText] = useState(details.caseData.latestMessage || "");
  const [error, setError] = useState<string | null>(null);
  const { invoiceTotal } = getInvoiceTotals(parts, services);

  useEffect(() => {
    if (!messageText) {
      setMessageText(
        buildDiagnosisMessage(
          details,
          formatMoney(invoiceTotal),
          "حسب التحديث",
          getDiagnosisText(details.caseData)
        )
      );
    }
  }, [details, invoiceTotal, messageText]);

  const addPart = async () => {
    if (!selectedPartId) return;
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/parts`, {
        method: "POST",
        body: { inventoryItemId: Number(selectedPartId), quantity: Number(partQuantity || 1) },
      });
      setSelectedPartId("");
      setPartQuantity("1");
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر إضافة القطعة");
    }
  };

  const removePart = async (partId: number) => {
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/parts/${partId}`, { method: "DELETE" });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر حذف القطعة");
    }
  };

  const addService = async () => {
    if (!serviceName.trim() || !servicePrice) return;
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/services`, {
        method: "POST",
        body: { serviceName, unitPrice: Number(servicePrice), quantity: 1 },
      });
      setServiceName("");
      setServicePrice("");
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر إضافة الخدمة");
    }
  };

  const removeService = async (serviceId: number) => {
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/services/${serviceId}`, { method: "DELETE" });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر حذف الخدمة");
    }
  };

  const saveDeliveryAndSend = async () => {
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}`, {
        method: "PATCH",
        body: {
          deliveryDueAt: new Date(`${deliveryDate}T12:00:00`).toISOString(),
          latestMessage: messageText,
          latestMessageChannel: channel,
          latestMessageSentAt: new Date().toISOString(),
        },
      });
      await apiClient(`/api/cases/${details.caseData.id}/execution/pause`, {
        method: "PATCH",
        body: {
          latestMessage: messageText,
          latestMessageChannel: channel,
          notes: "Execution details updated and sent to customer",
        },
      });
      open?.({ type: "success", message: "تم إرسال الرسالة", description: "تم إرسال تحديث التنفيذ وإيقاف المؤقت بانتظار الموافقة." });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر إرسال تحديث التنفيذ");
    }
  };

  return (
    <Card className="rounded-lg border-primary/30">
      <CardHeader><CardTitle>تعديل تفاصيل التنفيذ</CardTitle></CardHeader>
      <CardContent className="grid gap-5">
        {error && <ErrorMessage message={error} />}
        <p className="text-sm text-muted-foreground">تم إيقاف مؤقت التنفيذ مؤقتًا أثناء التعديل. مدة التنفيذ الأصلية مقفلة ولا يمكن تغييرها.</p>
        <Field label="موعد التسليم المتوقع">
          <Input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
        </Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-lg">إضافة قطعة</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                <SelectTrigger><SelectValue placeholder="اختر قطعة" /></SelectTrigger>
                <SelectContent>{inventoryItems.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name} - {item.code}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" min="1" value={partQuantity} onChange={(event) => setPartQuantity(event.target.value)} />
              <Button type="button" onClick={addPart}><Plus /> إضافة قطعة</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">إضافة خدمة</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="اسم الخدمة" />
              <Input type="number" min="0" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} placeholder="السعر" />
              <Button type="button" onClick={addService}><Plus /> إضافة خدمة</Button>
            </CardContent>
          </Card>
        </div>
        <EditableInvoicePreview parts={parts} services={services} onRemovePart={removePart} onRemoveService={removeService} />
        <div className="grid gap-3 rounded-lg border p-4">
          <h3 className="font-semibold">التواصل مع العميل</h3>
          <div className="flex flex-wrap gap-3">
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>{channelLabels.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" onClick={saveDeliveryAndSend}><Send /> إرسال التحديث</Button>
          </div>
          <Textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} className="min-h-36" />
        </div>
      </CardContent>
    </Card>
  );
}

function NotRepairableSection({ details, onSaved }: { details: CaseDetailsResponse; onSaved: () => Promise<void> }) {
  const navigate = useNavigate();
  const { open } = useNotification();
  const [reason, setReason] = useState(details.caseData.notRepairableReason || details.caseData.finalResult || "");
  const [error, setError] = useState<string | null>(null);

  const finalizeOperation = async () => {
    setError(null);
    if (!reason.trim()) {
      setError("سبب عدم التمكن من الإصلاح مطلوب.");
      return;
    }

    try {
      await apiClient(`/api/cases/${details.caseData.id}/finalize`, {
        method: "PATCH",
        body: {
          notRepairableReason: reason.trim(),
          finalResult: reason.trim(),
        },
      });
      open?.({ type: "success", message: "تم إنهاء العملية", description: "تم حفظ سبب عدم التمكن من الإصلاح ونقل الحالة إلى عمليات الصيانة." });
      await onSaved();
      navigate("/maintenance-operations");
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر إنهاء العملية");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>لا يمكن إصلاحها</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">
        احفظ السبب النهائي بوضوح حتى يبقى ظاهرًا في تفاصيل عملية الصيانة بعد الإنهاء.
      </p>
      <Field label="سبب عدم التمكن من الإصلاح">
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-36"
          placeholder="اكتب سبب عدم التمكن من الإصلاح"
        />
      </Field>
      {error && <ErrorMessage message={error} />}
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={finalizeOperation}>
          إنهاء العملية
        </Button>
      </div>
      </CardContent>
    </Card>
  );
}

function RepairedSection({ details, parts, services, onSaved }: { details: CaseDetailsResponse; parts: CasePart[]; services: CaseService[]; onSaved: () => Promise<void> }) {
  const navigate = useNavigate();
  const { open } = useNotification();
  const actualSeconds = getExecutionElapsedSeconds(details.caseData);
  const estimatedSeconds = getEstimatedExecutionSeconds(details.caseData);
  const performance = getPerformanceIndicator(actualSeconds, estimatedSeconds);
  const { invoiceTotal } = getInvoiceTotals(parts, services);
  const [completedWork, setCompletedWork] = useState(details.caseData.postRepairCompletedWork || "");
  const [tested, setTested] = useState(Boolean(details.caseData.postRepairTested));
  const [testCount, setTestCount] = useState(String(details.caseData.postRepairTestCount || 1));
  const [cleaned, setCleaned] = useState(Boolean(details.caseData.postRepairCleaned));
  const [recommendations, setRecommendations] = useState(details.caseData.postRepairRecommendations || "");
  const [repairImages, setRepairImages] = useState<string[]>(parseImageList(details.caseData.postRepairImages));
  const [damagedPartImages, setDamagedPartImages] = useState<string[]>(parseImageList(details.caseData.postRepairDamagedPartImages));
  const [note, setNote] = useState(details.caseData.postRepairNote || "");
  const [isReadyDialogOpen, setIsReadyDialogOpen] = useState(false);
  const [readySummary, setReadySummary] = useState(details.caseData.postRepairCompletedWork || "");
  const [readyFinalCost, setReadyFinalCost] = useState(formatMoney(invoiceTotal));
  const [pickupNote, setPickupNote] = useState("");
  const [readyMessage, setReadyMessage] = useState(details.caseData.readyNotificationMessage || "");
  const [readyChannel, setReadyChannel] = useState(details.caseData.readyNotificationChannel || "WhatsApp");
  const [isReadyMessageDirty, setIsReadyMessageDirty] = useState(false);
  const [isSendingReady, setIsSendingReady] = useState(false);
  const [selectedReadyMediaUrls, setSelectedReadyMediaUrls] = useState<string[]>([]);
  const [isUploadingRepairMedia, setIsUploadingRepairMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const customerName = details.customer?.name || "العميل";
  const customerPhone = details.customer?.phone || "";
  const availableReadyMedia = useMemo<ReadyMediaOption[]>(
    () =>
      [
        ...repairImages.map((imageUrl, index) => ({
          id: `repair-${index}`,
          label: `صورة الجهاز بعد الإصلاح ${index + 1}`,
          imageUrl,
          sendable: isPublicMediaUrl(imageUrl),
        })),
        ...damagedPartImages.map((imageUrl, index) => ({
          id: `damaged-${index}`,
          label: `صورة القطعة المعطوبة ${index + 1}`,
          imageUrl,
          sendable: isPublicMediaUrl(imageUrl),
        })),
      ],
    [damagedPartImages, repairImages]
  );
  const generatedReadyMessage = useMemo(
    () =>
      buildReadyMessage(
        customerName,
        details.caseData.caseCode,
        readySummary,
        readyFinalCost,
        pickupNote
      ),
    [customerName, details.caseData.caseCode, pickupNote, readyFinalCost, readySummary]
  );
  const orderedSelectedReadyMediaUrls = useMemo(
    () =>
      availableReadyMedia
        .filter((item) => selectedReadyMediaUrls.includes(item.imageUrl))
        .map((item) => item.imageUrl),
    [availableReadyMedia, selectedReadyMediaUrls]
  );

  useEffect(() => {
    if (!isReadyDialogOpen) return;
    setReadySummary(completedWork || details.caseData.postRepairCompletedWork || "");
    setReadyFinalCost(formatMoney(invoiceTotal));
    setIsReadyMessageDirty(false);
    setSelectedReadyMediaUrls(
      availableReadyMedia.filter((item) => item.sendable).map((item) => item.imageUrl)
    );
  }, [availableReadyMedia, completedWork, details.caseData.postRepairCompletedWork, invoiceTotal, isReadyDialogOpen]);

  useEffect(() => {
    if (!isReadyMessageDirty) {
      setReadyMessage(generatedReadyMessage);
    }
  }, [generatedReadyMessage, isReadyMessageDirty]);

  const uploadImages = (event: ChangeEvent<HTMLInputElement>, setter: (images: string[]) => void, current: string[]) => {
    const files = Array.from(event.target.files ?? []).slice(0, 4 - current.length);
    if (files.length === 0) return;

    Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
      if (file.size > MAX_INLINE_IMAGE_BYTES) {
        reject(new Error("إحدى الصور كبيرة. استخدم صورا أصغر حتى يتم ربط التخزين الخارجي."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("تعذر قراءة الصورة من الجهاز."));
      reader.readAsDataURL(file);
    })))
      .then((images) => {
        setter([...current, ...images].slice(0, 4));
        setError(null);
      })
      .catch((error) => setError(error instanceof Error ? error.message : "تعذر رفع الصور"));
  };

  const uploadImagesToSupabase = async (
    event: ChangeEvent<HTMLInputElement>,
    setter: (images: string[]) => void,
    current: string[],
    mediaCategory: "post_repair" | "damaged_part",
    fieldName: "postRepairImages" | "postRepairDamagedPartImages"
  ) => {
    const files = Array.from(event.target.files ?? []).slice(0, 4 - current.length);
    if (files.length === 0) return;

    if (files.some((file) => file.size > MAX_CASE_MEDIA_FILE_BYTES)) {
      setError("Ø¥Ø­Ø¯Ù‰ Ø§Ù„ØµÙˆØ± ÙƒØ¨ÙŠØ±Ø©. Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ 5 Ù…ÙŠØ¬Ø§Ø¨Ø§ÙŠØª Ù„ÙƒÙ„ Ù…Ù„Ù.");
      return;
    }

    setIsUploadingRepairMedia(true);

    try {
      const uploadedImages: string[] = [];

      for (const file of files) {
        const uploadedMedia = await uploadCaseImageFile({
          caseId: details.caseData.id,
          mediaCategory,
          file,
        });
        uploadedImages.push(uploadedMedia.publicUrl);
      }

      const nextImages = [...current, ...uploadedImages].slice(0, 4);

      await apiClient(`/api/cases/${details.caseData.id}`, {
        method: "PATCH",
        body: {
          [fieldName]: stringifyImageList(nextImages),
        },
      });

      setter(nextImages);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "ØªØ¹Ø°Ø± Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±");
    } finally {
      setIsUploadingRepairMedia(false);
      event.target.value = "";
    }
  };

  const buildQualityPayload = () => ({
    postRepairCompletedWork: completedWork,
    postRepairTested: tested,
    postRepairTestCount: Number(testCount || 1),
    postRepairCleaned: cleaned,
    postRepairRecommendations: recommendations,
    postRepairImages: stringifyImageList(repairImages),
    postRepairDamagedPartImages: stringifyImageList(damagedPartImages),
    postRepairNote: note,
  });

  const sendReadyNotification = async () => {
    setError(null);
    if (!customerPhone.trim()) {
      setError("رقم هاتف العميل مطلوب قبل إرسال إشعار الجاهزية.");
      return;
    }
    setIsSendingReady(true);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/ready-notification`, {
        method: "PATCH",
        body: {
          readyNotificationMessage: readyMessage || generatedReadyMessage,
          readyNotificationChannel: readyChannel,
          mediaUrls: orderedSelectedReadyMediaUrls,
        },
      });
      open?.({ type: "success", message: "تم إرسال الرسالة", description: "تم إرسال إشعار الجاهزية للعميل." });
      setIsReadyDialogOpen(false);
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر حفظ إشعار الجاهزية");
    } finally {
      setIsSendingReady(false);
    }
  };

  const markReceived = async () => {
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/customer-received`, { method: "PATCH" });
      open?.({ type: "success", message: "تم الاستلام", description: "تم تسجيل استلام العميل للجهاز." });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر تسجيل الاستلام");
    }
  };

  const finalizeOperation = async () => {
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/finalize`, {
        method: "PATCH",
        body: buildQualityPayload(),
      });
      open?.({ type: "success", message: "تم إنهاء العملية", description: "تم حفظ بيانات الجودة ونقل الحالة إلى عمليات الصيانة." });
      await onSaved();
      navigate("/maintenance-operations");
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر إنهاء العملية");
    }
  };

  return (
    <div className="grid gap-6">
    <Card className="rounded-lg">
      <CardHeader><CardTitle>ملخص الإصلاح</CardTitle></CardHeader>
      <CardContent className="grid gap-5">
        {error && <ErrorMessage message={error} />}
        <div className="grid gap-3 md:grid-cols-3">
          <Info label="وقت التنفيذ الفعلي" value={formatDuration(actualSeconds)} />
          <Info label="مدة التنفيذ المقدرة" value={`${details.caseData.executionDurationDays || 0} يوم / ${details.caseData.executionDurationHours || 0} ساعة`} />
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">مؤشر المتابعة</p>
            <Badge variant={performance.tone} className="mt-2">{performance.label}</Badge>
          </div>
        </div>
        <InvoicePreview parts={parts} services={services} />
      </CardContent>
    </Card>
    <Card className="rounded-lg">
      <CardHeader><CardTitle>فحص ما بعد الإصلاح والجودة</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <Field label="ما الذي تم إصلاحه؟"><Textarea value={completedWork} onChange={(event) => setCompletedWork(event.target.value)} className="min-h-28" /></Field>
        <label className="flex items-center gap-2 rounded-lg border p-3"><input type="checkbox" checked={tested} onChange={(event) => setTested(event.target.checked)} /> تم اختبار الجهاز بعد الإصلاح</label>
        <Field label="عدد مرات الاختبار"><Input type="number" min="1" value={testCount} onChange={(event) => setTestCount(event.target.value)} /></Field>
        <label className="flex items-center gap-2 rounded-lg border p-3"><input type="checkbox" checked={cleaned} onChange={(event) => setCleaned(event.target.checked)} /> تم تنظيف الجهاز</label>
        <Field label="نصائح فنية للعميل"><Textarea value={recommendations} onChange={(event) => setRecommendations(event.target.value)} /></Field>
        <ImageUploadGrid label="صور الجهاز بعد الإصلاح" images={repairImages} onUpload={(event) => uploadImagesToSupabase(event, setRepairImages, repairImages, "post_repair", "postRepairImages")} uploading={isUploadingRepairMedia} />
        <ImageUploadGrid label="القطعة المعطوبة" images={damagedPartImages} onUpload={(event) => uploadImagesToSupabase(event, setDamagedPartImages, damagedPartImages, "damaged_part", "postRepairDamagedPartImages")} uploading={isUploadingRepairMedia} />
        <Field label="ملاحظة"><Textarea value={note} onChange={(event) => setNote(event.target.value)} /></Field>
      </CardContent>
    </Card>
    <Card className="rounded-lg">
      <CardHeader><CardTitle>إشعار الجاهزية للعميل</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <InvoicePreview parts={parts} services={services} />
        <p className="text-sm text-muted-foreground">صور ما بعد الإصلاح والقطعة المعطوبة محفوظة مع الحالة ويمكن ربطها كمرفقات عند تفعيل تكامل WhatsApp/SMS لاحقا.</p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => setIsReadyDialogOpen(true)}>
            <Send />
            Send Ready Message
          </Button>
          <Button type="button" variant="outline" onClick={markReceived} disabled={!details.caseData.readyNotificationSentAt}>تم الاستلام</Button>
          <Button type="button" onClick={finalizeOperation} disabled={!details.caseData.customerReceivedAt}>إنهاء العملية</Button>
        </div>
        <Dialog open={isReadyDialogOpen} onOpenChange={setIsReadyDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>إرسال إشعار الجاهزية</DialogTitle>
              <DialogDescription>
                راجع ملخص الإصلاح والتكلفة النهائية قبل إرسال رسالة الجاهزية. إرسال الصور والمرفقات سيُترك لخطوة لاحقة.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="اسم العميل">
                  <Input value={customerName} readOnly />
                </Field>
                <Field label="رقم الهاتف">
                  <Input value={customerPhone} readOnly dir="ltr" />
                </Field>
                <Field label="رقم الحالة">
                  <Input value={details.caseData.caseCode} readOnly dir="ltr" />
                </Field>
                <Field label="قناة الإرسال">
                  <Select value={readyChannel} onValueChange={setReadyChannel}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {channelLabels.filter((item) => item !== "other").map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="ملخص الإصلاح">
                <Textarea value={readySummary} onChange={(event) => setReadySummary(event.target.value)} className="min-h-28" />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="التكلفة النهائية">
                  <Input value={readyFinalCost} onChange={(event) => setReadyFinalCost(event.target.value)} />
                </Field>
                <Field label="ملاحظة الاستلام">
                  <Input value={pickupNote} onChange={(event) => setPickupNote(event.target.value)} placeholder="مثال: يرجى الحضور بين 9 ص و5 م" />
                </Field>
              </div>
              <div className="grid gap-3 rounded-lg border p-4">
                <div className="space-y-1">
                  <Label>الصور المرفقة مع الرسالة</Label>
                  <p className="text-sm text-muted-foreground">
                    سيتم إرسال الصور فقط إذا كانت محفوظة كرابط عام مباشر. الصور المحلية المضمنة داخل الحالة ستبقى للمعاينة فقط حتى يتم ربط تخزين عام للوسائط.
                  </p>
                </div>
                {availableReadyMedia.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    لا توجد صور محفوظة مع هذه الحالة حاليًا. يمكن إرسال الرسالة كنص فقط دون مشكلة.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {availableReadyMedia.map((media) => {
                      const checked = selectedReadyMediaUrls.includes(media.imageUrl);
                      return (
                        <label
                          key={media.id}
                          className={`grid gap-3 rounded-lg border p-3 ${media.sendable ? "cursor-pointer" : "opacity-70"}`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!media.sendable}
                              onChange={(event) => {
                                setSelectedReadyMediaUrls((current) =>
                                  event.target.checked
                                    ? [...current, media.imageUrl]
                                    : current.filter((item) => item !== media.imageUrl)
                                );
                              }}
                            />
                            <div className="grid gap-2">
                              <span className="font-medium">{media.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {media.sendable ? "رابط عام جاهز للإرسال" : "غير قابل للإرسال حاليًا لأنه ليس رابطًا عامًا"}
                              </span>
                            </div>
                          </div>
                          <ImageBox imageUrl={media.imageUrl} label={media.label} />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <Field label="معاينة الرسالة النهائية">
                <Textarea
                  value={readyMessage}
                  onChange={(event) => {
                    setReadyMessage(event.target.value);
                    setIsReadyMessageDirty(true);
                  }}
                  className="min-h-56"
                />
              </Field>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReadyMessage(generatedReadyMessage);
                  setIsReadyMessageDirty(false);
                }}
              >
                تحديث المعاينة
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsReadyDialogOpen(false)} disabled={isSendingReady}>
                إلغاء
              </Button>
              <Button type="button" onClick={sendReadyNotification} disabled={isSendingReady}>
                <Send />
                {isSendingReady ? "جاري الإرسال..." : "إرسال إشعار الجاهزية"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
    </div>
  );
}

function InvoicePreview({ parts, services }: { parts: CasePart[]; services: CaseService[] }) {
  const { partsTotal, servicesTotal, invoiceTotal } = getInvoiceTotals(parts, services);
  return (
    <div className="grid gap-4 rounded-lg border p-4">
      <h3 className="text-lg font-semibold">معاينة الفاتورة</h3>
      <div className="grid gap-3">
        <h4 className="font-medium">القطع</h4>
        {parts.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">لا توجد قطع مضافة</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-5 gap-2 bg-muted/50 px-3 py-2 text-sm font-medium"><span>القطعة</span><span>الكود</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span></div>
            {parts.map((part) => <div key={part.id} className="grid grid-cols-5 gap-2 border-t px-3 py-2 text-sm"><span>{part.inventoryName || "قطعة"}</span><span>{part.inventoryCode || "-"}</span><span>{part.quantity}</span><span>{formatMoney(toNumber(part.unitPrice))}</span><span>{formatMoney(toNumber(part.totalPrice))}</span></div>)}
          </div>
        )}
      </div>
      <div className="grid gap-3">
        <h4 className="font-medium">الخدمات</h4>
        {services.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">لا توجد خدمات مضافة</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-3 gap-2 bg-muted/50 px-3 py-2 text-sm font-medium"><span>الخدمة</span><span>السعر</span><span>الإجمالي</span></div>
            {services.map((service) => <div key={service.id} className="grid grid-cols-3 gap-2 border-t px-3 py-2 text-sm"><span>{service.serviceName}</span><span>{formatMoney(toNumber(service.unitPrice))}</span><span>{formatMoney(toNumber(service.totalPrice))}</span></div>)}
          </div>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Info label="إجمالي القطع" value={formatMoney(partsTotal)} />
        <Info label="إجمالي الخدمات" value={formatMoney(servicesTotal)} />
        <Info label="الإجمالي التقديري" value={formatMoney(invoiceTotal)} />
      </div>
    </div>
  );
}

function EditableInvoicePreview({
  parts,
  services,
  onRemovePart,
  onRemoveService,
}: {
  parts: CasePart[];
  services: CaseService[];
  onRemovePart: (id: number) => void;
  onRemoveService: (id: number) => void;
}) {
  const { partsTotal, servicesTotal, invoiceTotal } = getInvoiceTotals(parts, services);
  return (
    <div className="grid gap-4 rounded-lg border p-4">
      <h3 className="text-lg font-semibold">الفاتورة القابلة للتعديل</h3>
      <div className="grid gap-2">
        {parts.map((part) => (
          <div key={part.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="font-medium">{part.inventoryName || "قطعة"}</p>
              <p className="text-sm text-muted-foreground">{part.inventoryCode || "-"} · {part.quantity} · {formatMoney(toNumber(part.totalPrice))}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onRemovePart(part.id)}>
              <Trash2 className="size-4" />
              حذف
            </Button>
          </div>
        ))}
        {services.map((service) => (
          <div key={service.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="font-medium">{service.serviceName}</p>
              <p className="text-sm text-muted-foreground">{formatMoney(toNumber(service.totalPrice))}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onRemoveService(service.id)}>
              <Trash2 className="size-4" />
              حذف
            </Button>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Info label="إجمالي القطع" value={formatMoney(partsTotal)} />
        <Info label="إجمالي الخدمات" value={formatMoney(servicesTotal)} />
        <Info label="الإجمالي" value={formatMoney(invoiceTotal)} />
      </div>
    </div>
  );
}

function ImageUploadGrid({
  label,
  images,
  uploading,
  onUpload,
}: {
  label: string;
  images: string[];
  uploading?: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label>{label}</Label>
        <Input className="max-w-sm" type="file" accept="image/*" multiple onChange={onUpload} disabled={uploading} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {images.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">لا توجد صور مرفوعة بعد</p>
        ) : (
          images.map((image, index) => <ImageBox key={`${label}-${index}`} imageUrl={image} label={`${label} ${index + 1}`} />)
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap font-medium leading-7">{value}</p></div>;
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>;
}

function ImageBox({ imageUrl, label, small }: { imageUrl?: string | null; label: string; small?: boolean }) {
  return (
    <div className={small ? "size-16 overflow-hidden rounded-lg border bg-muted/40" : "flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border bg-muted/40"}>
      {imageUrl ? <img src={imageUrl} alt={label} className="h-full w-full object-cover" /> : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageIcon className="size-6" />
          {!small && <span className="text-sm">صورة القطعة</span>}
        </div>
      )}
    </div>
  );
}

