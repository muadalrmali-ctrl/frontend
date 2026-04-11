import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useCreate, useList } from "@refinedev/core";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Priority = "منخفضة" | "متوسطة" | "مرتفعة" | "عاجلة";

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
};

type Technician = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type CreateCaseValues = {
  caseType: "internal" | "external";
  selectedCustomerId: number | null;
  selectedDeviceId: number | null;
  selectedTechnicianId: number | null;
  customerComplaint: string;
  serialNumber: string;
  technicianName: string;
  priority: Priority;
};

type NewCustomerValues = {
  name: string;
  phone: string;
  address: string;
};

type NewDeviceValues = {
  applianceType: string;
  brand: string;
  modelName: string;
  modelCode: string;
};

const initialValues: CreateCaseValues = {
  caseType: "internal",
  selectedCustomerId: null,
  selectedDeviceId: null,
  selectedTechnicianId: null,
  customerComplaint: "",
  serialNumber: "",
  technicianName: "",
  priority: "متوسطة",
};

const initialCustomerValues: NewCustomerValues = {
  name: "",
  phone: "",
  address: "",
};

const initialDeviceValues: NewDeviceValues = {
  applianceType: "",
  brand: "",
  modelName: "",
  modelCode: "",
};

export function CreateCasePage() {
  const navigate = useNavigate();
  const { mutateAsync: createCase, mutation: caseMutation } = useCreate();
  const { mutateAsync: createRecord, mutation: recordMutation } = useCreate();
  const customersQuery = useList<Customer>({ resource: "customers" });
  const devicesQuery = useList<Device>({ resource: "devices" });
  const techniciansQuery = useList<Technician>({ resource: "technicians" });
  const [values, setValues] = useState<CreateCaseValues>(initialValues);
  const [newCustomer, setNewCustomer] = useState<NewCustomerValues>(
    initialCustomerValues
  );
  const [newDevice, setNewDevice] = useState<NewDeviceValues>(
    initialDeviceValues
  );
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customers = customersQuery.result.data ?? [];
  const devices = devicesQuery.result.data ?? [];
  const technicians = techniciansQuery.result.data ?? [];
  const selectedTechnician = useMemo(
    () =>
      technicians.find(
        (technician) => technician.id === values.selectedTechnicianId
      ),
    [technicians, values.selectedTechnicianId]
  );

  const setField = <TKey extends keyof CreateCaseValues>(
    key: TKey,
    value: CreateCaseValues[TKey]
  ) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

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

      setValues((current) => ({
        ...current,
        selectedCustomerId: createdCustomer.data.id,
      }));
      setNewCustomer(initialCustomerValues);
      setIsCustomerDialogOpen(false);
      customersQuery.query.refetch();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create customer"
      );
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

      setValues((current) => ({
        ...current,
        selectedDeviceId: createdDevice.data.id,
      }));
      setNewDevice(initialDeviceValues);
      setIsDeviceDialogOpen(false);
      devicesQuery.query.refetch();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create device");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!values.selectedCustomerId) {
      setError("اختر العميل أو أنشئ عميل جديد أولا.");
      return;
    }

    if (!values.selectedDeviceId) {
      setError("اختر الجهاز أو أنشئ جهاز جديد أولا.");
      return;
    }

    if (!values.selectedTechnicianId || !selectedTechnician) {
      setError("اختر الفني المسؤول من القائمة.");
      return;
    }

    try {
      await createCase({
        resource: "cases",
        values: {
          customerId: values.selectedCustomerId,
          deviceId: values.selectedDeviceId,
          caseType: values.caseType,
          assignedTechnicianId: values.selectedTechnicianId,
          technicianName: selectedTechnician.name,
          customerComplaint: values.customerComplaint,
          serialNumber: values.serialNumber || undefined,
          priority: values.priority,
        },
      });

      navigate("/cases");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create case");
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <form id="create-case-form" className="space-y-6" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">إنشاء حالة جديدة</h1>
            <p className="text-muted-foreground">
              اختر العميل والجهاز والفني ثم أدخل وصف المشكلة لفتح حالة صيانة.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={caseMutation.isPending}>
              <Check />
              {caseMutation.isPending ? "جاري الإنشاء..." : "إنشاء حالة"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/cases")}
            >
              <ArrowLeft />
              إلغاء
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <FormSection
            title="بيانات العميل"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCustomerDialogOpen(true)}
              >
                <Plus />
                إنشاء عميل جديد
              </Button>
            }
          >
            <Field label="اختر العميل">
              <SearchableSelect
                emptyText="لا يوجد عملاء"
                placeholder="ابحث بالاسم أو الهاتف"
                selectedLabel={
                  customers.find(
                    (customer) => customer.id === values.selectedCustomerId
                  )?.name
                }
                items={customers}
                getKey={(customer) => customer.id}
                getValue={(customer) =>
                  `${customer.name} ${customer.phone} ${customer.address ?? ""}`
                }
                renderItem={(customer) => (
                  <div className="text-right">
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.phone}
                      {customer.address ? ` - ${customer.address}` : ""}
                    </p>
                  </div>
                )}
                onSelect={(customer) =>
                  setField("selectedCustomerId", customer.id)
                }
              />
            </Field>
          </FormSection>

          <FormSection
            title="بيانات الجهاز"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeviceDialogOpen(true)}
              >
                <Plus />
                إنشاء جهاز جديد
              </Button>
            }
          >
            <Field label="اختر الجهاز">
              <SearchableSelect
                emptyText="لا توجد أجهزة"
                placeholder="ابحث بنوع الجهاز أو الموديل"
                selectedLabel={
                  devices.find((device) => device.id === values.selectedDeviceId)
                    ? getDeviceLabel(
                        devices.find(
                          (device) => device.id === values.selectedDeviceId
                        ) as Device
                      )
                    : undefined
                }
                items={devices}
                getKey={(device) => device.id}
                getValue={(device) =>
                  `${device.applianceType} ${device.brand} ${device.modelName} ${device.modelCode ?? ""}`
                }
                renderItem={(device) => (
                  <div className="text-right">
                    <p className="font-medium">{getDeviceLabel(device)}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.modelCode ?? "بدون كود موديل"}
                    </p>
                  </div>
                )}
                onSelect={(device) => setField("selectedDeviceId", device.id)}
              />
            </Field>
            <Field label="الرقم التسلسلي" htmlFor="serialNumber">
              <Input
                id="serialNumber"
                value={values.serialNumber}
                onChange={(event) => setField("serialNumber", event.target.value)}
              />
            </Field>
          </FormSection>

          <FormSection title="وصف المشكلة">
            <Field label="وصف المشكلة" htmlFor="customerComplaint">
              <Textarea
                id="customerComplaint"
                className="min-h-32"
                value={values.customerComplaint}
                onChange={(event) =>
                  setField("customerComplaint", event.target.value)
                }
                required
              />
            </Field>
          </FormSection>

          <FormSection title="التعيين والأولوية">
            <Field label="نوع الحالة">
              <Select
                value={values.caseType}
                onValueChange={(value) =>
                  setField("caseType", value as CreateCaseValues["caseType"])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">داخلي داخل المركز</SelectItem>
                  <SelectItem value="external">خارجي / موقع العميل</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="الفني المسؤول">
              <SearchableSelect
                emptyText="لا يوجد فنيون"
                placeholder="ابحث عن فني"
                selectedLabel={selectedTechnician?.name}
                items={technicians}
                getKey={(technician) => technician.id}
                getValue={(technician) =>
                  `${technician.name} ${technician.email} ${technician.role}`
                }
                renderItem={(technician) => (
                  <div className="text-right">
                    <p className="font-medium">{technician.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {technician.email}
                    </p>
                  </div>
                )}
                onSelect={(technician) => {
                  setValues((current) => ({
                    ...current,
                    selectedTechnicianId: technician.id,
                    technicianName: technician.name,
                  }));
                }}
              />
            </Field>
            <Field label="الأولوية">
              <Select
                value={values.priority}
                onValueChange={(value) => setField("priority", value as Priority)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="منخفضة">منخفضة</SelectItem>
                  <SelectItem value="متوسطة">متوسطة</SelectItem>
                  <SelectItem value="مرتفعة">مرتفعة</SelectItem>
                  <SelectItem value="عاجلة">عاجلة</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FormSection>
        </div>
      </form>

      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء عميل جديد</DialogTitle>
            <DialogDescription>
              سيتم حفظ العميل واستخدامه مباشرة في الحالة الحالية.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="اسم العميل" htmlFor="newCustomerName">
              <Input
                id="newCustomerName"
                value={newCustomer.name}
                onChange={(event) =>
                  setNewCustomer((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="رقم الهاتف" htmlFor="newCustomerPhone">
              <Input
                id="newCustomerPhone"
                value={newCustomer.phone}
                onChange={(event) =>
                  setNewCustomer((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="المدينة / العنوان" htmlFor="newCustomerAddress">
              <Input
                id="newCustomerAddress"
                value={newCustomer.address}
                onChange={(event) =>
                  setNewCustomer((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCustomerDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleCreateCustomer}
              disabled={
                recordMutation.isPending ||
                !newCustomer.name.trim() ||
                !newCustomer.phone.trim()
              }
            >
              حفظ العميل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء جهاز جديد</DialogTitle>
            <DialogDescription>
              سيتم حفظ الجهاز واستخدامه مباشرة في الحالة الحالية.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="نوع الجهاز" htmlFor="newDeviceType">
              <Input
                id="newDeviceType"
                value={newDevice.applianceType}
                onChange={(event) =>
                  setNewDevice((current) => ({
                    ...current,
                    applianceType: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="اسم الجهاز / العلامة" htmlFor="newDeviceBrand">
              <Input
                id="newDeviceBrand"
                value={newDevice.brand}
                onChange={(event) =>
                  setNewDevice((current) => ({
                    ...current,
                    brand: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="الموديل" htmlFor="newDeviceModel">
              <Input
                id="newDeviceModel"
                value={newDevice.modelName}
                onChange={(event) =>
                  setNewDevice((current) => ({
                    ...current,
                    modelName: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="كود الموديل" htmlFor="newDeviceModelCode">
              <Input
                id="newDeviceModelCode"
                value={newDevice.modelCode}
                onChange={(event) =>
                  setNewDevice((current) => ({
                    ...current,
                    modelCode: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeviceDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleCreateDevice}
              disabled={
                recordMutation.isPending ||
                !newDevice.applianceType.trim() ||
                !newDevice.brand.trim() ||
                !newDevice.modelName.trim()
              }
            >
              حفظ الجهاز
            </Button>
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
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-auto min-h-11 w-full justify-between rounded-lg px-3 py-2 text-right",
            !selectedLabel && "text-muted-foreground"
          )}
        >
          <span className="truncate">{selectedLabel ?? placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
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

function FormSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
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

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function getDeviceLabel(device: Device) {
  return [device.brand, device.applianceType, device.modelName]
    .filter(Boolean)
    .join(" ");
}
