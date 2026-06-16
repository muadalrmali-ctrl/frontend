import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useCreate, useList, useNotification } from "@refinedev/core";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_CASE_IMAGE_FILE_BYTES,
  MAX_CASE_VIDEO_FILE_BYTES,
  uploadCaseImageFile,
  uploadCaseVideoFile,
} from "@/lib/case-media-upload";
import { ApiError } from "@/providers/api-client";
import { getStoredUser } from "@/providers/auth-provider";
import { hasPermission } from "@/lib/access-control";
import { cn } from "@/lib/utils";

type Customer = { id: number; name: string; phone: string; address?: string | null };
type Device = { id: number; applianceType: string; brand: string; modelName: string; modelCode?: string | null };
type CreatedCase = { id: number };
type ReceptionPoint = { id: number; name: string; city: string; area?: string | null; status: string };

type CreateCaseValues = {
  caseType: "internal" | "external";
  selectedCustomerId: number | null;
  selectedDeviceId: number | null;
  customerComplaint: string;
  processingMode: "send_to_main_center" | "local_repair";
  localTechnicianName: string;
  localTechnicianPhone: string;
  localRepairNotes: string;
  receivingLocation: string;
};

type NewCustomerValues = { name: string; phone: string; address: string };
type NewDeviceValues = { applianceType: string; brand: string; modelName: string; modelCode: string };

const initialValues: CreateCaseValues = {
  caseType: "internal",
  selectedCustomerId: null,
  selectedDeviceId: null,
  customerComplaint: "",
  processingMode: "send_to_main_center",
  localTechnicianName: "",
  localTechnicianPhone: "",
  localRepairNotes: "",
  receivingLocation: "main_center",
};

const initialCustomerValues: NewCustomerValues = { name: "", phone: "", address: "" };
const initialDeviceValues: NewDeviceValues = { applianceType: "", brand: "", modelName: "", modelCode: "" };

const getRequestErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError && error.data && typeof error.data === "object") {
    const payload = error.data as {
      message?: string;
      error?: string;
      errors?: Array<{ message?: string; path?: Array<string | number> }>;
    };
    const issues = Array.isArray(payload.errors)
      ? payload.errors
          .map((issue) => {
            const path = issue.path?.length ? `${issue.path.join(".")}: ` : "";
            return `${path}${issue.message || ""}`.trim();
          })
          .filter(Boolean)
      : [];

    if (issues.length > 0) {
      return `${payload.message || error.message}: ${issues.join("، ")}`;
    }

    if (payload.error) {
      return `${payload.message || error.message}: ${payload.error}`;
    }
  }

  return error instanceof Error ? error.message : fallback;
};

export function CreateCasePage() {
  const navigate = useNavigate();
  const { open } = useNotification();
  const { mutateAsync: createCase, mutation: caseMutation } = useCreate();
  const { mutateAsync: createRecord, mutation: recordMutation } = useCreate();
  const currentUser = getStoredUser();
  const isReceptionPointUser = currentUser?.role === "reception_point_user";
  const canCreateReceptionPointCases = hasPermission(currentUser, "reception_points.manage");
  const customersQuery = useList<Customer>({ resource: "customers" });
  const devicesQuery = useList<Device>({ resource: "devices" });
  const receptionPointsQuery = useList<ReceptionPoint>({
    resource: "reception-points",
    queryOptions: { enabled: canCreateReceptionPointCases },
  });
  const [values, setValues] = useState<CreateCaseValues>(initialValues);
  const [newCustomer, setNewCustomer] = useState<NewCustomerValues>(initialCustomerValues);
  const [newDevice, setNewDevice] = useState<NewDeviceValues>(initialDeviceValues);
  const [intakeImages, setIntakeImages] = useState<File[]>([]);
  const [intakeVideos, setIntakeVideos] = useState<File[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customers = customersQuery.result.data ?? [];
  const devices = devicesQuery.result.data ?? [];
  const activeReceptionPoints = (receptionPointsQuery.result.data ?? []).filter((point) => point.status === "active");
  const selectedReceptionPointId = values.receivingLocation.startsWith("reception_point:")
    ? Number(values.receivingLocation.split(":")[1])
    : null;
  const isReceptionPointCase = Boolean(selectedReceptionPointId);
  const activeReceptionPoint = activeReceptionPoints.find((point) => point.id === (selectedReceptionPointId ?? currentUser?.receptionPointId));
  const lockedReceptionPointLabel = activeReceptionPoint
    ? `${activeReceptionPoint.name}${activeReceptionPoint.city ? ` - ${activeReceptionPoint.city}` : ""}`
    : "نقطة الاستلام الخاصة بك";
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === values.selectedCustomerId),
    [customers, values.selectedCustomerId]
  );
  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === values.selectedDeviceId),
    [devices, values.selectedDeviceId]
  );

  const setField = <TKey extends keyof CreateCaseValues>(key: TKey, value: CreateCaseValues[TKey]) =>
    setValues((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (isReceptionPointUser && currentUser?.receptionPointId) {
      setField("receivingLocation", `reception_point:${currentUser.receptionPointId}`);
    }
  }, [isReceptionPointUser, currentUser?.receptionPointId]);

  const handleCreateCustomer = async () => {
    setError(null);

    try {
      const createdCustomer = (await createRecord({
        resource: "customers",
        values: {
          name: newCustomer.name,
          phone: newCustomer.phone,
          address: newCustomer.address || undefined,
        },
      })) as { data: Customer };

      setValues((current) => ({ ...current, selectedCustomerId: createdCustomer.data.id }));
      setNewCustomer(initialCustomerValues);
      setIsCustomerDialogOpen(false);
      customersQuery.query.refetch();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create customer");
    }
  };

  const handleCreateDevice = async () => {
    setError(null);

    try {
      const createdDevice = (await createRecord({
        resource: "devices",
        values: {
          applianceType: newDevice.applianceType,
          brand: newDevice.brand,
          modelName: newDevice.modelName,
          modelCode: newDevice.modelCode || undefined,
        },
      })) as { data: Device };

      setValues((current) => ({ ...current, selectedDeviceId: createdDevice.data.id }));
      setNewDevice(initialDeviceValues);
      setIsDeviceDialogOpen(false);
      devicesQuery.query.refetch();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create device");
    }
  };

  const validateMediaFiles = (files: File[], type: "image" | "video") => {
    const maxSize = type === "image" ? MAX_CASE_IMAGE_FILE_BYTES : MAX_CASE_VIDEO_FILE_BYTES;
    const label = type === "image" ? "الصورة" : "الفيديو";

    for (const file of files) {
      if (!file.type.startsWith(`${type}/`)) {
        throw new Error(type === "image" ? "يرجى اختيار ملفات صور فقط." : "يرجى اختيار ملفات فيديو فقط.");
      }

      if (file.size > maxSize) {
        const maxMegabytes = Math.floor(maxSize / (1024 * 1024));
        throw new Error(`${label} ${file.name} أكبر من الحد المسموح (${maxMegabytes} ميجابايت).`);
      }
    }
  };

  const handleIntakeImagesChange = (files: File[]) => {
    try {
      validateMediaFiles(files, "image");
      setError(null);
      setIntakeImages(files);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "تعذر اختيار الصور.");
    }
  };

  const handleIntakeVideosChange = (files: File[]) => {
    try {
      validateMediaFiles(files, "video");
      setError(null);
      setIntakeVideos(files);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "تعذر اختيار الفيديوهات.");
    }
  };

  const uploadIntakeMedia = async (caseId: number) => {
    const uploads = [
      ...intakeImages.map((file) =>
        uploadCaseImageFile({
          caseId,
          mediaCategory: isReceptionPointCase ? "reception_point_intake" : "case_intake",
          file,
        })
      ),
      ...intakeVideos.map((file) =>
        uploadCaseVideoFile({
          caseId,
          mediaCategory: isReceptionPointCase ? "reception_point_intake" : "case_intake",
          file,
        })
      ),
    ];

    if (uploads.length === 0) return;

    setIsUploadingMedia(true);
    try {
      await Promise.all(uploads);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!values.selectedCustomerId) {
      setError("اختر العميل أو أنشئ عميلا جديدا أولا.");
      return;
    }

    if (!values.selectedDeviceId) {
      setError("اختر الجهاز أو أنشئ جهازا جديدا أولا.");
      return;
    }

    if (!values.customerComplaint.trim()) {
      setError("أدخل وصف العطل قبل إنشاء الحالة.");
      return;
    }

    let createdCaseId: number | null = null;

    try {
      const created = (await createCase({
        resource: "cases",
        values: {
          customerId: values.selectedCustomerId,
          deviceId: values.selectedDeviceId,
          caseType: values.caseType,
          customerComplaint: values.customerComplaint.trim(),
          ...(isReceptionPointCase
            ? {
                sourceType: "reception_point",
                receptionPointId: selectedReceptionPointId,
                processingMode: values.processingMode,
                transferStatus: values.processingMode === "send_to_main_center" ? "in_transit" : "not_required",
                localTechnicianName: values.processingMode === "local_repair" ? values.localTechnicianName.trim() || null : null,
                localTechnicianPhone: values.processingMode === "local_repair" ? values.localTechnicianPhone.trim() || null : null,
                localRepairNotes: values.processingMode === "local_repair" ? values.localRepairNotes.trim() || null : null,
              }
            : {
                sourceType: "main_center",
                receptionPointId: null,
                processingMode: "main_center_repair",
                transferStatus: "not_required",
              }),
        },
      })) as { data: CreatedCase };

      createdCaseId = created.data.id;
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Failed to create case"));
      return;
    }

    try {
      await uploadIntakeMedia(createdCaseId);

      open?.({
        type: "success",
        message: "تم إنشاء الحالة بنجاح",
      });
      navigate("/cases");
    } catch (uploadError) {
      const message = getRequestErrorMessage(uploadError, "تعذر رفع مرفقات الاستلام.");
      open?.({
        type: "error",
        message: "تم إنشاء الحالة لكن تعذر رفع مرفقات الاستلام",
        description: message,
      });
      navigate(`/cases/${createdCaseId}`);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <form id="create-case-form" className="space-y-6" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">إنشاء حالة جديدة</h1>
            <p className="text-muted-foreground">
              اختر العميل والجهاز ثم أدخل وصف العطل لفتح حالة صيانة.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={caseMutation.isPending || isUploadingMedia}>
              <Check />
              {caseMutation.isPending || isUploadingMedia ? "جارٍ الإنشاء..." : "إنشاء حالة"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/cases")}>
              <ArrowLeft />
              إلغاء
            </Button>
          </div>
        </div>

        {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <FormSection title="موقع الاستلام">
            <Field label="نقطة الاستلام">
              <Select
                value={values.receivingLocation}
                onValueChange={(value) => setField("receivingLocation", value)}
                disabled={isReceptionPointUser || !canCreateReceptionPointCases}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {!isReceptionPointUser ? <SelectItem value="main_center">المركز الرئيسي</SelectItem> : null}
                  {isReceptionPointUser && currentUser?.receptionPointId ? (
                    <SelectItem value={`reception_point:${currentUser.receptionPointId}`}>
                      {lockedReceptionPointLabel}
                    </SelectItem>
                  ) : null}
                  {activeReceptionPoints.map((point) => (
                    <SelectItem key={point.id} value={`reception_point:${point.id}`}>
                      {point.name} - {point.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {isReceptionPointUser ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                هذه الحالة سيتم تسجيلها باسم نقطة الاستلام الخاصة بك.
              </p>
            ) : !canCreateReceptionPointCases ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                سيتم تسجيل الحالة في المركز الرئيسي.
              </p>
            ) : null}
          </FormSection>

          <FormSection
            title="بيانات العميل"
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCustomerDialogOpen(true)}>
                <Plus />
                إنشاء عميل جديد
              </Button>
            }
          >
            <Field label="اختر العميل">
              <SearchableSelect
                emptyText="لا يوجد عملاء"
                placeholder="ابحث بالاسم أو الهاتف"
                selectedLabel={selectedCustomer?.name}
                items={customers}
                getKey={(customer) => customer.id}
                getValue={(customer) => `${customer.name} ${customer.phone} ${customer.address ?? ""}`}
                renderItem={(customer) => (
                  <div className="text-right">
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.phone}{customer.address ? ` - ${customer.address}` : ""}</p>
                  </div>
                )}
                onSelect={(customer) => setField("selectedCustomerId", customer.id)}
              />
            </Field>
          </FormSection>

          <FormSection
            title="بيانات الجهاز"
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDeviceDialogOpen(true)}>
                <Plus />
                إنشاء جهاز جديد
              </Button>
            }
          >
            <Field label="اختر الجهاز">
              <SearchableSelect
                emptyText="لا توجد أجهزة"
                placeholder="ابحث بنوع الجهاز أو الموديل"
                selectedLabel={selectedDevice ? getDeviceLabel(selectedDevice) : undefined}
                items={devices}
                getKey={(device) => device.id}
                getValue={(device) => `${device.applianceType} ${device.brand} ${device.modelName} ${device.modelCode ?? ""}`}
                renderItem={(device) => (
                  <div className="text-right">
                    <p className="font-medium">{getDeviceLabel(device)}</p>
                    <p className="text-xs text-muted-foreground">{device.modelCode ?? "بدون كود موديل"}</p>
                  </div>
                )}
                onSelect={(device) => setField("selectedDeviceId", device.id)}
              />
            </Field>
          </FormSection>

          <FormSection title="وصف الحالة">
            <Field label="وصف العطل" htmlFor="customerComplaint">
              <Textarea id="customerComplaint" className="min-h-32" value={values.customerComplaint} onChange={(event) => setField("customerComplaint", event.target.value)} required />
            </Field>
            <Field label="نوع الحالة">
              <Select value={values.caseType} onValueChange={(value) => setField("caseType", value as CreateCaseValues["caseType"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">داخلي</SelectItem>
                  <SelectItem value="external">خارجي</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FormSection>

          {isReceptionPointCase ? (
            <FormSection title="مسار المعالجة">
              <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                نقطة الاستلام: <span className="font-bold text-foreground">{activeReceptionPoint?.name || "نقطة الاستلام الحالية"}</span>
              </div>
              <Field label="اختر المسار">
                <Select value={values.processingMode} onValueChange={(value) => setField("processingMode", value as CreateCaseValues["processingMode"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_to_main_center">إرسال إلى المركز الرئيسي</SelectItem>
                    <SelectItem value="local_repair">صيانة محلية</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {values.processingMode === "local_repair" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="اسم الفني المحلي" htmlFor="localTechnicianName">
                    <Input id="localTechnicianName" value={values.localTechnicianName} onChange={(event) => setField("localTechnicianName", event.target.value)} />
                  </Field>
                  <Field label="هاتف الفني المحلي" htmlFor="localTechnicianPhone">
                    <Input id="localTechnicianPhone" value={values.localTechnicianPhone} onChange={(event) => setField("localTechnicianPhone", event.target.value)} />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="ملاحظات الصيانة المحلية" htmlFor="localRepairNotes">
                      <Textarea id="localRepairNotes" value={values.localRepairNotes} onChange={(event) => setField("localRepairNotes", event.target.value)} />
                    </Field>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">سيتم إنشاء الحالة كقيد النقل إلى المركز حتى يؤكد موظف المركز الاستلام.</p>
              )}
            </FormSection>
          ) : null}

          <FormSection title="مرفقات الاستلام">
            <MediaPicker
              label="صور الاستلام"
              description="صور توثق حالة الجهاز عند الاستلام. الحد الأقصى 5 ميجابايت للصورة."
              accept="image/*"
              files={intakeImages}
              onChange={handleIntakeImagesChange}
            />
            <MediaPicker
              label="فيديو الاستلام"
              description="فيديوهات توثق حالة الجهاز عند الاستلام. الحد الأقصى 25 ميجابايت للفيديو."
              accept="video/*"
              files={intakeVideos}
              onChange={handleIntakeVideosChange}
            />
          </FormSection>
        </div>
      </form>

      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء عميل جديد</DialogTitle>
            <DialogDescription>سيتم حفظ العميل واستخدامه مباشرة في الحالة الحالية.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="اسم العميل" htmlFor="newCustomerName">
              <Input id="newCustomerName" value={newCustomer.name} onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="رقم الهاتف" htmlFor="newCustomerPhone">
              <Input id="newCustomerPhone" value={newCustomer.phone} onChange={(event) => setNewCustomer((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="المدينة / العنوان" htmlFor="newCustomerAddress">
              <Input id="newCustomerAddress" value={newCustomer.address} onChange={(event) => setNewCustomer((current) => ({ ...current, address: event.target.value }))} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>إلغاء</Button>
            <Button type="button" onClick={handleCreateCustomer} disabled={recordMutation.isPending || !newCustomer.name.trim() || !newCustomer.phone.trim()}>حفظ العميل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء جهاز جديد</DialogTitle>
            <DialogDescription>سيتم حفظ الجهاز واستخدامه مباشرة في الحالة الحالية.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="نوع الجهاز" htmlFor="newDeviceType">
              <Input id="newDeviceType" value={newDevice.applianceType} onChange={(event) => setNewDevice((current) => ({ ...current, applianceType: event.target.value }))} />
            </Field>
            <Field label="الماركة" htmlFor="newDeviceBrand">
              <Input id="newDeviceBrand" value={newDevice.brand} onChange={(event) => setNewDevice((current) => ({ ...current, brand: event.target.value }))} />
            </Field>
            <Field label="الموديل" htmlFor="newDeviceModel">
              <Input id="newDeviceModel" value={newDevice.modelName} onChange={(event) => setNewDevice((current) => ({ ...current, modelName: event.target.value }))} />
            </Field>
            <Field label="كود الموديل" htmlFor="newDeviceModelCode">
              <Input id="newDeviceModelCode" value={newDevice.modelCode} onChange={(event) => setNewDevice((current) => ({ ...current, modelCode: event.target.value }))} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeviceDialogOpen(false)}>إلغاء</Button>
            <Button type="button" onClick={handleCreateDevice} disabled={recordMutation.isPending || !newDevice.applianceType.trim() || !newDevice.brand.trim() || !newDevice.modelName.trim()}>حفظ الجهاز</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function SearchableSelect<TItem>({
  items,
  selectedLabel,
  placeholder,
  emptyText,
  getKey,
  getValue,
  renderItem,
  onSelect,
}: {
  items: TItem[];
  selectedLabel?: string;
  placeholder: string;
  emptyText: string;
  getKey: (item: TItem) => number | string;
  getValue: (item: TItem) => string;
  renderItem: (item: TItem) => ReactNode;
  onSelect: (item: TItem) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className={cn("h-auto min-h-11 w-full justify-between rounded-lg px-3 py-2 text-right", !selectedLabel && "text-muted-foreground")}>
          <span className="truncate">{selectedLabel ?? placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command dir="rtl">
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={getKey(item)}
                  value={getValue(item)}
                  onSelect={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  {renderItem(item)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function FormSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xl">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function MediaPicker({
  label,
  description,
  accept,
  files,
  onChange,
}: {
  label: string;
  description: string;
  accept: string;
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <div className="grid gap-1">
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Input type="file" accept={accept} multiple onChange={(event) => onChange(Array.from(event.target.files ?? []))} />
      {files.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {previews.map(({ file, url }) => (
            <div key={`${file.name}-${file.size}`} className="grid gap-2 rounded-lg border p-3">
              {file.type.startsWith("image/") ? (
                <div className="aspect-[4/3] overflow-hidden rounded-lg border bg-muted/30">
                  <img src={url} alt={file.name} className="h-full w-full object-cover" />
                </div>
              ) : null}
              {file.type.startsWith("video/") ? (
                <div className="overflow-hidden rounded-lg border bg-black">
                  <video src={url} controls className="aspect-video w-full object-contain" />
                </div>
              ) : null}
              <span className="truncate text-sm text-muted-foreground">{file.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">لا توجد مرفقات مختارة بعد.</p>
      )}
    </div>
  );
}

function getDeviceLabel(device: Device) {
  return [device.brand, device.applianceType, device.modelName].filter(Boolean).join(" ");
}
