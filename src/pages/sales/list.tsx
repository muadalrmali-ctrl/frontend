import { FormEvent, ReactNode, useMemo, useState } from "react";
import { useGetIdentity, useList, useNotification } from "@refinedev/core";
import { CheckCircle2, FileText, PackagePlus, Plus, ReceiptText, Search } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/providers/api-client";

type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type SaleRecord = {
  id: number;
  saleCode?: string | null;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  total: string;
  caseCode?: string | null;
  customerName?: string | null;
  directCustomerName?: string | null;
  directCustomerPhone?: string | null;
  saleDate?: string | null;
  createdAt?: string | null;
  createdByName?: string | null;
};

type InventoryItem = {
  id: number;
  name: string;
  code: string;
  quantity: number;
  warehouseQuantity?: number;
  totalQuantity?: number;
  sellingPrice?: string | null;
  unitCost?: string | null;
};

type SaleFormLine = {
  inventoryItemId: string;
  quantity: string;
  unitPrice: string;
};

const formatMoney = (value?: string | number | null) =>
  `${Number(value || 0).toLocaleString("ar-LY", { maximumFractionDigits: 3 })} د.ل`;

const formatDate = (value?: string | null) => {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getSaleTypeLabel = (invoiceType: string) =>
  invoiceType === "direct_sale" ? "بيع مباشر" : "بيع ناتج من صيانة";

const getSaleStatusMeta = (status: string) => {
  if (status === "paid") {
    return {
      label: "مؤكد",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "cancelled") {
    return {
      label: "ملغي",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  return {
    label: "غير مؤكد",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
};

const createEmptyLine = (): SaleFormLine => ({
  inventoryItemId: "",
  quantity: "1",
  unitPrice: "",
});

export function SalesPage() {
  const { data: currentUser } = useGetIdentity<CurrentUser>();
  const { open } = useNotification();
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<SaleFormLine[]>([createEmptyLine()]);

  const salesQuery = useList<SaleRecord>({ resource: "sales" });
  const inventoryQuery = useList<InventoryItem>({ resource: "inventory" });

  const sales = salesQuery.result.data ?? [];
  const inventoryItems = inventoryQuery.result.data ?? [];
  const inventoryById = useMemo(
    () => new Map(inventoryItems.map((item) => [String(item.id), item])),
    [inventoryItems]
  );

  const filteredSales = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return sales;

    return sales.filter((sale) =>
      [
        sale.saleCode,
        sale.invoiceNumber,
        sale.caseCode,
        sale.customerName,
        sale.directCustomerName,
        sale.createdByName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [sales, search]);

  const formTotal = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity || 0);
    const price = Number(line.unitPrice || 0);
    return sum + quantity * price;
  }, 0);

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setLines([createEmptyLine()]);
    setFormError(null);
  };

  const updateLine = (index: number, partial: Partial<SaleFormLine>) => {
    setLines((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;

        const nextLine = { ...line, ...partial };
        if (partial.inventoryItemId !== undefined) {
          const selectedItem = inventoryById.get(partial.inventoryItemId);
          nextLine.unitPrice = String(selectedItem?.sellingPrice || selectedItem?.unitCost || "");
        }
        return nextLine;
      })
    );
  };

  const submitDirectSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const preparedItems = lines.map((line) => {
      const selectedItem = inventoryById.get(line.inventoryItemId);
      return {
        selectedItem,
        quantity: Number(line.quantity || 0),
        unitPrice: Number(line.unitPrice || 0),
      };
    });

    if (!customerName.trim()) {
      setFormError("أدخل اسم العميل.");
      return;
    }

    if (preparedItems.some((entry) => !entry.selectedItem)) {
      setFormError("اختر كل القطع قبل حفظ البيع.");
      return;
    }

    if (preparedItems.some((entry) => !Number.isFinite(entry.quantity) || entry.quantity <= 0)) {
      setFormError("أدخل كميات صحيحة لكل البنود.");
      return;
    }

    if (preparedItems.some((entry) => !Number.isFinite(entry.unitPrice) || entry.unitPrice < 0)) {
      setFormError("أدخل أسعارًا صحيحة لكل البنود.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient("/api/invoices", {
        method: "POST",
        body: {
          directCustomerName: customerName.trim(),
          directCustomerPhone: customerPhone.trim() || undefined,
          notes: notes.trim() || undefined,
          items: preparedItems.map((entry) => ({
            referenceId: entry.selectedItem!.id,
            quantity: entry.quantity,
            unitPrice: entry.unitPrice,
          })),
        },
      });

      open?.({
        type: "success",
        message: "تم إنشاء البيع",
        description: "تم حفظ البيع كمسودة غير مؤكدة بانتظار تصديق مدير المخزن.",
      });
      resetForm();
      setIsCreateDialogOpen(false);
      await salesQuery.query.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "تعذر إنشاء البيع المباشر");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-shell" dir="rtl">
      <div className="page-hero flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">المبيعات</h1>
          <p className="text-muted-foreground">
            سجل موحد لبيع الصيانة والبيع المباشر، مع حالة التأكيد وتتبع الكمية الخارجة من المخزون.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <MetricCard icon={<ReceiptText className="size-4" />} label="إجمالي السجلات" value={String(sales.length)} />
          <MetricCard
            icon={<CheckCircle2 className="size-4" />}
            label="المبيعات المؤكدة"
            value={String(sales.filter((sale) => sale.status === "paid").length)}
          />
          <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="size-4" />
            بيع مباشر جديد
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pr-10"
                placeholder="ابحث برقم البيع أو الحالة أو العميل..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredSales.length} سجل
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/70 bg-card/80">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle>سجل المبيعات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {salesQuery.query.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">جارٍ تحميل المبيعات...</p>
          ) : salesQuery.query.error ? (
            <p className="p-6 text-sm text-destructive">{salesQuery.query.error.message}</p>
          ) : filteredSales.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">لا توجد مبيعات مطابقة.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم البيع</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">رمز الحالة</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => {
                    const statusMeta = getSaleStatusMeta(sale.status);
                    return (
                      <TableRow key={sale.id} className="transition-colors hover:bg-muted/20">
                        <TableCell className="font-medium">
                          <Link to={`/sales/${sale.id}`} className="hover:underline">
                            {sale.saleCode || sale.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusMeta.className}>
                            {statusMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{getSaleTypeLabel(sale.invoiceType)}</TableCell>
                        <TableCell>{sale.caseCode || "-"}</TableCell>
                        <TableCell>{sale.customerName || sale.directCustomerName || "غير محدد"}</TableCell>
                        <TableCell>{formatDate(sale.saleDate || sale.createdAt)}</TableCell>
                        <TableCell>{formatMoney(sale.total)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>بيع مباشر جديد</DialogTitle>
            <DialogDescription>
              يتم حفظ البيع أولاً كمسودة غير مؤكدة. تأكيد مدير المخزن هو الخطوة التي تخصم الكمية فعلياً من المخزون.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-5" onSubmit={submitDirectSale}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="اسم العميل">
                <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
              </Field>
              <Field label="الهاتف">
                <Input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
              </Field>
            </div>

            <Card className="rounded-xl border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">بنود البيع</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => setLines((current) => [...current, createEmptyLine()])}>
                  <PackagePlus className="size-4" />
                  إضافة بند
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4">
                {lines.map((line, index) => {
                  const selectedItem = inventoryById.get(line.inventoryItemId);
                  return (
                    <div key={index} className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-4 md:grid-cols-[1.5fr_0.6fr_0.7fr_auto]">
                      <Field label="القطعة">
                        <select
                          value={line.inventoryItemId}
                          onChange={(event) => updateLine(index, { inventoryItemId: event.target.value })}
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          required
                        >
                          <option value="">{inventoryQuery.query.isLoading ? "جارٍ تحميل القطع..." : "اختر القطعة"}</option>
                          {inventoryItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} - {item.code} - بالمخزن {item.warehouseQuantity ?? item.quantity}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="الكمية">
                        <Input type="number" min="1" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} required />
                      </Field>
                      <Field label="السعر">
                        <Input type="number" min="0" step="0.001" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} required />
                      </Field>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={lines.length === 1}
                          onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                        >
                          حذف
                        </Button>
                      </div>
                      {selectedItem && (
                        <p className="md:col-span-4 text-xs text-muted-foreground">
                          الكمية الحالية بالمخزن: {selectedItem.warehouseQuantity ?? selectedItem.quantity} • الإجمالي المتتبع: {selectedItem.totalQuantity ?? selectedItem.quantity}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Field label="ملاحظات">
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24" />
            </Field>

            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
              <p className="text-sm text-muted-foreground">إجمالي البيع</p>
              <p className="text-xl font-semibold">{formatMoney(formTotal)}</p>
            </div>

            {formError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                حفظ كبيع غير مؤكد
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
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
