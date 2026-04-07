import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useList } from "@refinedev/core";
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
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  assignedTechnicianId?: number | null;
  createdAt?: string | null;
};

type Customer = { id: number; name: string; phone: string; address?: string | null };
type Device = { id: number; applianceType: string; brand: string; modelName: string; modelCode?: string | null; notes?: string | null };
type UserSummary = { id: number; name: string; email: string };
type CaseHistory = { id: number; toStatus: string; notes?: string | null; createdAt?: string | null };
type InventoryItem = { id: number; name: string; code: string; quantity?: number; sellingPrice?: string | null; unitCost?: string | null; imageUrl?: string | null };
type CasePart = { id: number; quantity: number; unitPrice: string; totalPrice: string; inventoryName?: string | null; inventoryCode?: string | null; inventoryImageUrl?: string | null };
type CaseService = { id: number; serviceName: string; quantity: number; unitPrice: string; totalPrice: string };

const statusLabels: Record<string, string> = {
  received: "حالة جديدة",
  waiting_part: "بانتظار القطعة",
  diagnosing: "قيد التشخيص",
  waiting_approval: "بانتظار الموافقة",
  in_progress: "قيد التنفيذ",
  repaired: "تم الإصلاح",
  not_repairable: "لا يمكن إصلاحها",
};

const channelLabels = ["WhatsApp", "Email", "SMS", "other"];
const MAX_INLINE_IMAGE_BYTES = 900_000;

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
const getInvoiceTotals = (parts: CasePart[], services: CaseService[]) => {
  const partsTotal = parts.reduce((sum, part) => sum + toNumber(part.totalPrice), 0);
  const servicesTotal = services.reduce((sum, service) => sum + toNumber(service.totalPrice), 0);
  return { partsTotal, servicesTotal, invoiceTotal: partsTotal + servicesTotal };
};
const getDiagnosisText = (caseData: CaseData) => caseData.diagnosisNote || caseData.faultCause || "";
const buildDiagnosisMessage = (details: CaseDetailsResponse, invoiceTotal: number, expectedDays: string, diagnosisText: string) => {
  const customerName = details.customer?.name || "العميل";
  const daysText = expectedDays || "غير محدد";
  return [
    `السلام عليكم أستاذ ${customerName}`,
    `نود أن نعلمك أن تشخيص الحالة ${details.caseData.caseCode} هو:`,
    diagnosisText || "لم يتم إدخال ملاحظة التشخيص بعد.",
    `التكلفة التقديرية: ${formatMoney(invoiceTotal)}`,
    "هل توافق على العمل؟",
    `موعد التسليم المتوقع بعد الموافقة: ${daysText} يوم`,
  ].join("\n");
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
          {status === "waiting_approval" && <WaitingApprovalSection details={details} parts={parts} services={services} onSaved={loadDetails} />}
          {status === "in_progress" && <ExecutionSection details={details} parts={parts} services={services} onSaved={loadDetails} />}
          {status === "repaired" && <RepairedSection details={details} parts={parts} services={services} />}
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
              <Field label="رفع صورة من الجهاز"><Input type="file" accept="image/*" onChange={handleImageUpload} /></Field>
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
  const [channel, setChannel] = useState(details.caseData.latestMessageChannel || "WhatsApp");
  const [messageText, setMessageText] = useState("");
  const [isMessageDirty, setIsMessageDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { invoiceTotal } = getInvoiceTotals(parts, services);
  const selectedPart = inventoryItems.find((item) => String(item.id) === selectedPartId);
  const generatedMessage = useMemo(() => buildDiagnosisMessage(details, invoiceTotal, deliveryDays, diagnosisText), [details, invoiceTotal, deliveryDays, diagnosisText]);

  useEffect(() => {
    if (!isMessageDirty) setMessageText(generatedMessage);
  }, [generatedMessage, isMessageDirty]);

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
    setError(null);
    try {
      await persistDiagnosis();
      await apiClient(`/api/cases/${details.caseData.id}`, {
        method: "PATCH",
        body: { latestMessage: messageText || generatedMessage, latestMessageChannel: channel, latestMessageSentAt: new Date().toISOString() },
      });
      if (details.caseData.status !== "waiting_approval") {
        await apiClient(`/api/cases/${details.caseData.id}/status`, {
          method: "PATCH",
          body: { toStatus: "waiting_approval", notes: "Diagnosis approval message prepared. Sending integration is pending." },
        });
      }
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر تجهيز الرسالة");
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
        <div className="grid gap-4">
          <div className="flex items-center gap-2"><MessageSquare className="size-5" /><h3 className="text-lg font-semibold">التواصل مع العميل</h3></div>
          <div className="flex flex-wrap gap-3">
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>{channelLabels.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => { setMessageText(generatedMessage); setIsMessageDirty(false); }}>تحديث الرسالة من البيانات</Button>
          </div>
          <Textarea value={messageText} onChange={(event) => { setMessageText(event.target.value); setIsMessageDirty(true); }} className="min-h-44" />
          <p className="text-sm text-muted-foreground">الإرسال الفعلي عبر WhatsApp/SMS/Email غير مربوط بعد. الزر يحفظ محتوى الرسالة وينقل الحالة إلى بانتظار الموافقة عند التشخيص.</p>
          <Button type="button" className="w-fit" onClick={handleSendMessage}><Send /> إرسال رسالة</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WaitingApprovalSection({ details, parts, services, onSaved }: { details: CaseDetailsResponse; parts: CasePart[]; services: CaseService[]; onSaved: () => Promise<void> }) {
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [showExecutionPrep, setShowExecutionPrep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { invoiceTotal } = getInvoiceTotals(parts, services);

  const resendMessage = async () => {
    setError(null);
    try {
      const message = details.caseData.latestMessage || buildDiagnosisMessage(details, invoiceTotal, "غير محدد", getDiagnosisText(details.caseData));
      await apiClient(`/api/cases/${details.caseData.id}`, {
        method: "PATCH",
        body: {
          latestMessage: message,
          latestMessageChannel: details.caseData.latestMessageChannel || "WhatsApp",
          latestMessageSentAt: new Date().toISOString(),
        },
      });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر إعادة الإرسال");
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
            <Button type="button" onClick={() => setShowExecutionPrep(true)}><CheckCircle2 /> تمت الموافقة</Button>
          </div>
        </CardContent>
      </Card>
      {isEditingInvoice && <DiagnosisInvoiceSection details={details} parts={parts} services={services} onSaved={onSaved} />}
      {showExecutionPrep && <ExecutionPreparationSection details={details} onSaved={onSaved} />}
    </div>
  );
}

function ExecutionPreparationSection({ details, onSaved }: { details: CaseDetailsResponse; onSaved: () => Promise<void> }) {
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
          assignedTechnicianId: technicianId ? Number(technicianId) : undefined,
          notes: "Execution prepared after customer approval",
        },
      });
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
  const [now, setNow] = useState(Date.now());
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { invoiceTotal } = getInvoiceTotals(parts, services);
  const remainingSeconds = getRemainingExecutionSeconds(details.caseData, now);
  const isPaused = Boolean(details.caseData.executionTimerPausedAt);
  const resendMessageText = details.caseData.latestMessage || buildDiagnosisMessage(details, invoiceTotal, "غير محدد", getDiagnosisText(details.caseData));

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const pauseForApproval = async () => {
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/execution/pause`, {
        method: "PATCH",
        body: {
          latestMessage: resendMessageText,
          latestMessageChannel: details.caseData.latestMessageChannel || "WhatsApp",
          notes: "Execution paused after resending updated details for approval",
        },
      });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر إيقاف المؤقت مؤقتا");
    }
  };
  const resumeExecution = async () => {
    setError(null);
    try {
      await apiClient(`/api/cases/${details.caseData.id}/execution/resume`, {
        method: "PATCH",
        body: { notes: "Customer approved updated execution details" },
      });
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
            <Info label="الوقت المتبقي للفني" value={formatDuration(remainingSeconds)} />
          </div>
          <InvoicePreview parts={parts} services={services} />
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setIsEditingInvoice((value) => !value)}>تعديل</Button>
            <Button type="button" variant="outline" onClick={pauseForApproval} disabled={isPaused}><PauseCircle /> إعادة إرسال</Button>
            <Button type="button" variant="outline" onClick={resumeExecution} disabled={!isPaused}><PlayCircle /> تمت الموافقة</Button>
            <Button type="button" onClick={completeRepair}><CheckCircle2 /> تم الإصلاح</Button>
          </div>
        </CardContent>
      </Card>
      {isEditingInvoice && <DiagnosisInvoiceSection details={details} parts={parts} services={services} onSaved={onSaved} />}
    </div>
  );
}

function RepairedSection({ details, parts, services }: { details: CaseDetailsResponse; parts: CasePart[]; services: CaseService[] }) {
  return (
    <Card className="rounded-lg">
      <CardHeader><CardTitle>ملخص الإصلاح</CardTitle></CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Info label="بدأ التنفيذ" value={formatDate(details.caseData.executionTimerStartedAt)} />
          <Info label="انتهى التنفيذ" value={formatDate(details.caseData.executionCompletedAt)} />
          <Info label="مدة التنفيذ المخططة" value={`${details.caseData.executionDurationDays || 0} يوم / ${details.caseData.executionDurationHours || 0} ساعة`} />
        </div>
        <InvoicePreview parts={parts} services={services} />
      </CardContent>
    </Card>
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
