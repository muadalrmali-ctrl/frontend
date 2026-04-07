import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowRight, ImageIcon, MessageSquare, PackageSearch, Plus, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  waitingPartInventoryItemId?: number | null;
  waitingPartName?: string | null;
  waitingPartNotes?: string | null;
  waitingPartImageUrl?: string | null;
  diagnosisNote?: string | null;
  faultCause?: string | null;
  latestMessage?: string | null;
  latestMessageChannel?: string | null;
  latestMessageSentAt?: string | null;
  createdAt?: string | null;
};

type Customer = {
  id: number;
  name: string;
  phone: string;
  address?: string | null;
};

type Device = {
  id: number;
  applianceType: string;
  brand: string;
  modelName: string;
  modelCode?: string | null;
  notes?: string | null;
};

type UserSummary = {
  id: number;
  name: string;
  email: string;
};

type CaseHistory = {
  id: number;
  toStatus: string;
  notes?: string | null;
  createdAt?: string | null;
};

type InventoryItem = {
  id: number;
  name: string;
  code: string;
  quantity?: number;
  sellingPrice?: string | null;
  unitCost?: string | null;
  imageUrl?: string | null;
};

type CasePart = {
  id: number;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  inventoryName?: string | null;
  inventoryCode?: string | null;
};

type CaseService = {
  id: number;
  serviceName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

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

const formatDate = (value?: string | null) => {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const toNumber = (value?: string | null) => {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
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
          <p className="mt-2 text-muted-foreground">
            صفحة تشغيلية لمتابعة بيانات الحالة والقطع والتشخيص والتواصل.
          </p>
        </div>
        {details && (
          <div className="rounded-lg border bg-card px-4 py-3 text-left">
            <p className="text-sm text-muted-foreground">رقم الحالة</p>
            <p className="text-2xl font-semibold">{details.caseData.caseCode}</p>
          </div>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">جاري تحميل التفاصيل...</p>}
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {details && (
        <>
          <BasicCaseInfo details={details} />

          {status === "waiting_part" && (
            <WaitingPartSection details={details} onSaved={loadDetails} />
          )}

          {status === "diagnosing" && (
            <DiagnosisInvoiceSection
              details={details}
              parts={parts}
              services={services}
              onSaved={loadDetails}
            />
          )}
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
        <CardHeader>
          <CardTitle>المعلومات الأساسية</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Info label="حالة الحالة / الأولوية" value={details.caseData.priority || "متوسطة"} />
          <Info label="تاريخ الإنشاء" value={formatDate(details.caseData.createdAt)} />
          <Info label="رقم الحالة" value={details.caseData.caseCode} />
          <Info label="أنشأها من" value={details.createdByUser?.name || "غير محدد"} />
          <Info
            label="الفني المسؤول"
            value={details.assignedTechnician?.name || details.caseData.technicianName || "غير معين"}
          />
          <Info label="آخر رسالة" value={details.caseData.latestMessage || latestHistory?.notes || "لا توجد رسالة"} />
          <Info label="سبب الخطأ" value={details.caseData.faultCause || "لم يحدد بعد"} />
          <Info label="وصف الخطأ" value={details.caseData.customerComplaint} />
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>بيانات العميل</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Info label="الاسم" value={details.customer?.name || "غير محدد"} />
            <Info label="الهاتف" value={details.customer?.phone || "غير محدد"} />
            <Info label="العنوان" value={details.customer?.address || "غير محدد"} />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>بيانات الجهاز</CardTitle>
          </CardHeader>
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

function WaitingPartSection({
  details,
  onSaved,
}: {
  details: CaseDetailsResponse;
  onSaved: () => Promise<void>;
}) {
  const { result } = useList<InventoryItem>({ resource: "inventory" });
  const inventoryItems = result.data ?? [];
  const [selectedItemId, setSelectedItemId] = useState(
    details.caseData.waitingPartInventoryItemId
      ? String(details.caseData.waitingPartInventoryItemId)
      : "manual"
  );
  const [manualName, setManualName] = useState(details.caseData.waitingPartName ?? "");
  const [notes, setNotes] = useState(details.caseData.waitingPartNotes ?? "");
  const [imageUrl, setImageUrl] = useState(details.caseData.waitingPartImageUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  const selectedItem = inventoryItems.find(
    (item) => String(item.id) === selectedItemId
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await apiClient(`/api/cases/${details.caseData.id}`, {
        method: "PATCH",
        body: {
          waitingPartInventoryItemId:
            selectedItemId === "manual" ? null : Number(selectedItemId),
          waitingPartName: selectedItemId === "manual" ? manualName : selectedItem?.name,
          waitingPartNotes: notes,
          waitingPartImageUrl: selectedItem?.imageUrl ?? imageUrl,
        },
      });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر حفظ القطعة المنتظرة");
    }
  };

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageSearch />
          القطعة المنتظرة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="اختيار من المخزون">
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">إدخال يدوي</SelectItem>
                {inventoryItems.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name} - {item.code}
                  </SelectItem>
                ))}
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
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="اسم / وصف القطعة">
                <Input value={manualName} onChange={(event) => setManualName(event.target.value)} />
              </Field>
              <Field label="رابط الصورة">
                <Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
              </Field>
            </div>
          )}

          <Field label="ملاحظات">
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>

          {error && <ErrorMessage message={error} />}
          <Button type="submit" className="w-fit">حفظ القطعة المنتظرة</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DiagnosisInvoiceSection({
  details,
  parts,
  services,
  onSaved,
}: {
  details: CaseDetailsResponse;
  parts: CasePart[];
  services: CaseService[];
  onSaved: () => Promise<void>;
}) {
  const { result } = useList<InventoryItem>({ resource: "inventory" });
  const inventoryItems = result.data ?? [];
  const [deliveryDays, setDeliveryDays] = useState("3");
  const [deliveryDate, setDeliveryDate] = useState(
    details.caseData.deliveryDueAt?.slice(0, 10) ?? ""
  );
  const [diagnosisNote, setDiagnosisNote] = useState(details.caseData.diagnosisNote ?? "");
  const [faultCause, setFaultCause] = useState(details.caseData.faultCause ?? "");
  const [selectedPartId, setSelectedPartId] = useState("");
  const [partQuantity, setPartQuantity] = useState("1");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [channel, setChannel] = useState("WhatsApp");
  const [error, setError] = useState<string | null>(null);

  const partsTotal = parts.reduce((sum, part) => sum + toNumber(part.totalPrice), 0);
  const servicesTotal = services.reduce((sum, service) => sum + toNumber(service.totalPrice), 0);
  const invoiceTotal = partsTotal + servicesTotal;
  const selectedPart = inventoryItems.find((item) => String(item.id) === selectedPartId);

  const expectedDeliveryAt = useMemo(() => {
    if (deliveryDate) return new Date(`${deliveryDate}T12:00:00`).toISOString();
    const date = new Date();
    date.setDate(date.getDate() + Number(deliveryDays || 0));
    return date.toISOString();
  }, [deliveryDate, deliveryDays]);

  const messageText = `التشخيص: ${diagnosisNote || "لم يتم إدخال الملاحظة بعد"}\nسبب العطل: ${faultCause || "غير محدد"}\nالتكلفة التقديرية: ${invoiceTotal.toLocaleString("ar-LY")} د.ل\nهل توافق على العمل؟`;

  const persistDiagnosis = async () => {
    await apiClient(`/api/cases/${details.caseData.id}`, {
      method: "PATCH",
      body: {
        diagnosisNote,
        faultCause,
        deliveryDueAt: expectedDeliveryAt,
      },
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
        body: {
          inventoryItemId: Number(selectedPartId),
          quantity: Number(partQuantity || 1),
        },
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
        body: {
          serviceName,
          unitPrice: Number(servicePrice),
          quantity: 1,
        },
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
        body: {
          latestMessage: messageText,
          latestMessageChannel: channel,
          latestMessageSentAt: new Date().toISOString(),
        },
      });
      await apiClient(`/api/cases/${details.caseData.id}/status`, {
        method: "PATCH",
        body: {
          toStatus: "waiting_approval",
          notes: "Diagnosis approval message prepared. Sending integration is pending.",
        },
      });
      await onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر تجهيز الرسالة");
    }
  };

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>التشخيص والفاتورة</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        {error && <ErrorMessage message={error} />}

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="عدد الأيام المتوقع">
            <Input type="number" min="0" value={deliveryDays} onChange={(event) => setDeliveryDays(event.target.value)} />
          </Field>
          <Field label="أو اختر تاريخا مباشرا">
            <Input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button type="button" onClick={saveDiagnosis}>حفظ التشخيص</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="الملاحظة">
            <Textarea value={diagnosisNote} onChange={(event) => setDiagnosisNote(event.target.value)} />
          </Field>
          <Field label="سبب العطل">
            <Textarea value={faultCause} onChange={(event) => setFaultCause(event.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إضافة قطعة</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر قطعة من المخزون" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name} - {item.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPart && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <ImageBox imageUrl={selectedPart.imageUrl} label={selectedPart.name} small />
                  <div>
                    <p className="font-medium">{selectedPart.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedPart.code}</p>
                  </div>
                </div>
              )}
              <Input type="number" min="1" value={partQuantity} onChange={(event) => setPartQuantity(event.target.value)} />
              <Button type="button" onClick={handleAddPart}>
                <Plus />
                إضافة قطعة
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إضافة خدمة</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="صيانة / فحص / عمل يد / قبض" />
              <Input type="number" min="0" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} placeholder="السعر" />
              <Button type="button" onClick={handleAddService}>
                <Plus />
                إضافة خدمة
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-3">
          <Info label="إجمالي القطع" value={`${partsTotal.toLocaleString("ar-LY")} د.ل`} />
          <Info label="إجمالي الخدمات" value={`${servicesTotal.toLocaleString("ar-LY")} د.ل`} />
          <Info label="الإجمالي التقديري" value={`${invoiceTotal.toLocaleString("ar-LY")} د.ل`} />
        </div>

        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5" />
            <h3 className="text-lg font-semibold">التواصل مع العميل</h3>
          </div>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channelLabels.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea value={messageText} readOnly className="min-h-36" />
          <p className="text-sm text-muted-foreground">
            الإرسال الفعلي عبر WhatsApp/SMS/Email غير مربوط بعد. الزر يحفظ محتوى الرسالة وينقل الحالة إلى بانتظار الموافقة.
          </p>
          <Button type="button" className="w-fit" onClick={handleSendMessage}>
            <Send />
            إرسال رسالة
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium leading-7">{value}</p>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

function ImageBox({
  imageUrl,
  label,
  small,
}: {
  imageUrl?: string | null;
  label: string;
  small?: boolean;
}) {
  return (
    <div className={small ? "size-16 overflow-hidden rounded-lg border bg-muted/40" : "flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border bg-muted/40"}>
      {imageUrl ? (
        <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageIcon className="size-6" />
          {!small && <span className="text-sm">صورة القطعة</span>}
        </div>
      )}
    </div>
  );
}
