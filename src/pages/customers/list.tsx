import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useCreate, useList } from "@refinedev/core";
import { Grid2X2, List, Plus, UserRound } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasPermission } from "@/lib/access-control";
import { getStoredUser } from "@/providers/auth-provider";

type Customer = {
  id: number;
  name: string;
  phone: string;
  address?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  casesCount?: number;
};

type ViewMode = "box" | "list";

type CreateCustomerForm = {
  name: string;
  phone: string;
  address: string;
  notes: string;
};

const VIEW_MODE_STORAGE_KEY = "customers:view-mode";

const initialForm: CreateCustomerForm = {
  name: "",
  phone: "",
  address: "",
  notes: "",
};

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("ar-LY").format(new Date(value)) : "-";

const getCasesCount = (customer: Customer) => customer.casesCount ?? 0;

export function CustomersPage() {
  const currentUser = getStoredUser();
  const canCreateCustomer = hasPermission(currentUser, "create_customer");
  const { result, query } = useList<Customer>({ resource: "customers" });
  const { mutateAsync: createCustomer, mutation } = useCreate();
  const customers = result.data ?? [];

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const storedValue = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return storedValue === "list" || storedValue === "box" ? storedValue : "box";
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateCustomerForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const customerCountText = useMemo(() => `${customers.length} عميل`, [customers.length]);

  const setField = <TKey extends keyof CreateCustomerForm>(key: TKey, value: CreateCustomerForm[TKey]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.name.trim() || !form.phone.trim()) {
      setFormError("أدخل اسم العميل ورقم الهاتف.");
      return;
    }

    try {
      await createCustomer({
        resource: "customers",
        values: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim() || undefined,
          notes: form.notes.trim() || undefined,
        },
      });
      await query.refetch();
      resetForm();
      setIsCreateDialogOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "تعذر إنشاء العميل");
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">العملاء</h1>
          <p className="text-muted-foreground">سجل العملاء وتاريخ الصيانة والفواتير.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-lg border bg-card p-1">
            <Button type="button" size="sm" variant={viewMode === "box" ? "default" : "ghost"} onClick={() => setViewMode("box")}>
              <Grid2X2 className="size-4" />
              عرض الصناديق
            </Button>
            <Button type="button" size="sm" variant={viewMode === "list" ? "default" : "ghost"} onClick={() => setViewMode("list")}>
              <List className="size-4" />
              عرض القائمة
            </Button>
          </div>
          {canCreateCustomer ? (
            <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="size-4" />
              إضافة عميل جديد
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <Badge variant="outline">{customerCountText}</Badge>
          <p className="text-sm text-muted-foreground">اضغط على اسم العميل أو الصندوق لفتح التفاصيل.</p>
        </CardContent>
      </Card>

      {query.isLoading && <p className="text-muted-foreground">جاري تحميل العملاء...</p>}
      {query.error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{query.error.message}</p>}
      {!query.isLoading && !query.error && customers.length === 0 && <p className="rounded-lg border p-4 text-sm text-muted-foreground">لا يوجد عملاء.</p>}
      {!query.isLoading && !query.error && customers.length > 0 && (
        viewMode === "box" ? <CustomersBoxView customers={customers} /> : <CustomersListView customers={customers} />
      )}

      {canCreateCustomer ? (
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent dir="rtl" className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة عميل جديد</DialogTitle>
              <DialogDescription>أدخل بيانات العميل الأساسية لاستخدامها في الحالات والفواتير.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="اسم العميل">
                  <Input value={form.name} onChange={(event) => setField("name", event.target.value)} required />
                </Field>
                <Field label="الهاتف">
                  <Input dir="ltr" value={form.phone} onChange={(event) => setField("phone", event.target.value)} required />
                </Field>
                <div className="md:col-span-2">
                  <Field label="العنوان">
                    <Input value={form.address} onChange={(event) => setField("address", event.target.value)} />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="ملاحظات">
                    <Textarea value={form.notes} onChange={(event) => setField("notes", event.target.value)} />
                  </Field>
                </div>
              </div>
              {formError ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "جارٍ الإنشاء..." : "إنشاء عميل"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}

function CustomersListView({ customers }: { customers: Customer[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">الهاتف</TableHead>
              <TableHead className="text-right">العنوان</TableHead>
              <TableHead className="text-right">عدد الحالات</TableHead>
              <TableHead className="text-right">تاريخ الإنشاء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="min-w-48 font-medium">
                  <Link to={`/accounting/customers/${customer.id}`} className="hover:underline">{customer.name}</Link>
                </TableCell>
                <TableCell dir="ltr" className="text-right">{customer.phone}</TableCell>
                <TableCell>{customer.address || "-"}</TableCell>
                <TableCell>{getCasesCount(customer)}</TableCell>
                <TableCell>{formatDate(customer.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CustomersBoxView({ customers }: { customers: Customer[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {customers.map((customer) => (
        <Link key={customer.id} to={`/accounting/customers/${customer.id}`} className="block">
          <Card className="h-full rounded-lg transition hover:border-primary/50 hover:shadow-md">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg leading-7">{customer.name}</CardTitle>
                    <p className="text-sm text-muted-foreground" dir="ltr">{customer.phone}</p>
                  </div>
                </div>
                <Badge variant="outline">{getCasesCount(customer)} حالة</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <InfoRow label="المدينة / العنوان" value={customer.address || "غير محدد"} />
              <InfoRow label="تاريخ الإنشاء" value={formatDate(customer.createdAt)} />
              {customer.notes ? <p className="line-clamp-2 rounded-md bg-muted/40 px-3 py-2 text-muted-foreground">{customer.notes}</p> : null}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
