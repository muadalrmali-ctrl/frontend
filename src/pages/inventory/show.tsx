import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useList, useNotification, useOne } from "@refinedev/core";
import { ArrowRight, Edit3, Package, PencilLine, Trash2, Warehouse } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { hasPermission } from "@/lib/access-control";
import { apiClient } from "@/providers/api-client";
import { getStoredUser } from "@/providers/auth-provider";

type InventoryCategory = {
  id: number;
  name: string;
};

type ProductDetails = {
  id: number;
  name: string;
  code: string;
  categoryId?: number | null;
  categoryName?: string | null;
  brand?: string | null;
  model?: string | null;
  quantity: number;
  totalQuantity: number;
  warehouseQuantity: number;
  minimumStock?: number | null;
  unitCost: string;
  sellingPrice?: string | null;
  imageUrl?: string | null;
  location?: string | null;
  description?: string | null;
  isActive: boolean;
  caseAllocations: Array<{
    caseId: number;
    caseCode: string;
    quantity: number;
    handoffStatus: string;
    deliveredAt?: string | null;
    receivedAt?: string | null;
  }>;
  salesHistory: Array<{
    quantity: number;
    happenedAt?: string | null;
    caseId?: number | null;
    caseCode?: string | null;
    invoiceNumber?: string | null;
    customerName?: string | null;
    source: string;
  }>;
  movementHistory: Array<{
    id: number;
    movementType: string;
    quantity: number;
    notes?: string | null;
    createdAt?: string | null;
    createdByName?: string | null;
  }>;
};

type EditFormState = {
  name: string;
  code: string;
  categoryId: string;
  brand: string;
  model: string;
  unitCost: string;
  sellingPrice: string;
  minimumStock: string;
  location: string;
  description: string;
};

const formatMoney = (value?: string | null) =>
  `${Number(value || 0).toLocaleString("ar-LY", { maximumFractionDigits: 3 })} د.ل`;

const formatDate = (value?: string | null) => {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getStockTone = (quantity: number, minimumStock?: number | null) => {
  const limit = minimumStock ?? 0;
  if (quantity <= 0) return "border-red-200 bg-red-50 text-red-700";
  if (limit > 0 && quantity <= limit) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};

const getMovementLabel = (movementType: string) => {
  switch (movementType) {
    case "adjustment":
      return "تحديث الكمية";
    case "item_updated":
      return "تحديث بيانات القطعة";
    case "item_archived":
      return "حذف / أرشفة القطعة";
    case "delivered_to_case":
      return "تسليم إلى حالة";
    case "returned_from_case":
      return "إرجاع من حالة";
    case "consumed_in_repair":
      return "استهلاك في عملية صيانة";
    case "sold_direct":
      return "بيع مباشر";
    default:
      return movementType;
  }
};

export function InventoryDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { open } = useNotification();
  const currentUser = getStoredUser();
  const productId = Number(id);
  const { result, query } = useOne<ProductDetails>({
    resource: "inventory",
    id: productId,
    queryOptions: {
      enabled: Number.isFinite(productId),
    },
  });
  const categoriesQuery = useList<InventoryCategory>({
    resource: "inventory-categories",
  });

  const item = result ?? null;
  const categories = categoriesQuery.result.data ?? [];
  const canEditItem = hasPermission(currentUser, "inventory.item.edit");
  const canAdjustQuantity = hasPermission(currentUser, "inventory.item.quantity.update");
  const canDeleteItem = hasPermission(currentUser, "inventory.item.delete");
  const hasAdminActions = canEditItem || canAdjustQuantity || canDeleteItem;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [quantityAdjustment, setQuantityAdjustment] = useState("0");
  const [quantityNote, setQuantityNote] = useState("");
  const [editForm, setEditForm] = useState<EditFormState>({
    name: "",
    code: "",
    categoryId: "none",
    brand: "",
    model: "",
    unitCost: "",
    sellingPrice: "",
    minimumStock: "",
    location: "",
    description: "",
  });

  useEffect(() => {
    if (!item) return;
    setEditForm({
      name: item.name,
      code: item.code,
      categoryId: item.categoryId ? String(item.categoryId) : "none",
      brand: item.brand || "",
      model: item.model || "",
      unitCost: item.unitCost || "",
      sellingPrice: item.sellingPrice || "",
      minimumStock: item.minimumStock != null ? String(item.minimumStock) : "",
      location: item.location || "",
      description: item.description || "",
    });
  }, [item]);

  const allocatedTotal = useMemo(
    () =>
      (item?.caseAllocations ?? []).reduce(
        (sum: number, entry: ProductDetails["caseAllocations"][number]) => sum + Number(entry.quantity || 0),
        0
      ),
    [item?.caseAllocations]
  );

  if (!Number.isFinite(productId)) {
    return <p className="text-sm text-destructive">رقم القطعة غير صالح.</p>;
  }

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiClient(`/api/inventory/items/${item.id}`, {
        method: "PATCH",
        body: {
          name: editForm.name.trim(),
          code: editForm.code.trim(),
          categoryId: editForm.categoryId === "none" ? null : Number(editForm.categoryId),
          brand: editForm.brand.trim() || null,
          model: editForm.model.trim() || null,
          unitCost: Number(editForm.unitCost || 0),
          sellingPrice: editForm.sellingPrice.trim() ? Number(editForm.sellingPrice) : null,
          minimumStock: editForm.minimumStock.trim() ? Number(editForm.minimumStock) : null,
          location: editForm.location.trim() || null,
          description: editForm.description.trim() || null,
        },
      });
      open?.({ type: "success", message: "تم تحديث البيانات", description: "تم حفظ بيانات القطعة بنجاح." });
      setIsEditDialogOpen(false);
      await query.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "تعذر تحديث بيانات القطعة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitQuantityUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiClient(`/api/inventory/items/${item.id}/adjust`, {
        method: "POST",
        body: {
          quantity: Number(quantityAdjustment || 0),
          notes: quantityNote.trim() || undefined,
        },
      });
      open?.({ type: "success", message: "تم تحديث الكمية", description: "تم تعديل كمية المخزون بنجاح." });
      setQuantityAdjustment("0");
      setQuantityNote("");
      setIsQuantityDialogOpen(false);
      await query.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "تعذر تحديث الكمية");
    } finally {
      setIsSubmitting(false);
    }
  };

  const archiveItem = async () => {
    if (!item) return;

    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiClient(`/api/inventory/items/${item.id}`, {
        method: "DELETE",
      });
      open?.({ type: "success", message: "تم حذف القطعة", description: "تمت أرشفة القطعة وإخفاؤها من العمل الجاري." });
      navigate("/inventory");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "تعذر حذف القطعة");
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button type="button" variant="ghost" onClick={() => navigate("/inventory")}>
            <ArrowRight />
            العودة إلى المخزون
          </Button>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">{item?.name || "تفاصيل القطعة"}</h1>
            {item && (
              <Badge variant="outline" className={getStockTone(item.totalQuantity, item.minimumStock)}>
                إجمالي الكمية: {item.totalQuantity}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-muted-foreground">
            صفحة تفصيلية لعرض بيانات القطعة، أماكن تواجدها الحالية، وحركة الاستخدام أو البيع مع إجراءات إدارية واضحة في الأعلى.
          </p>
        </div>
      </div>

      {query.isLoading && <p className="text-muted-foreground">جارٍ تحميل بيانات القطعة...</p>}
      {query.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {query.error.message}
        </p>
      )}

      {item && (
        <>
          {formError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          {hasAdminActions && (
            <Card className="rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle>إجراءات الإدارة</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {canAdjustQuantity ? (
                  <Button type="button" onClick={() => setIsQuantityDialogOpen(true)}>
                    <Edit3 />
                    تحديث الكمية
                  </Button>
                ) : null}
                {canEditItem ? (
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                    <PencilLine />
                    تحديث البيانات
                  </Button>
                ) : null}
                {canDeleteItem ? (
                  <Button type="button" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 />
                    حذف
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>المعلومات العامة</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Info label="اسم القطعة" value={item.name} />
                <Info label="الكود / المرجع" value={item.code} />
                <Info label="الفئة" value={item.categoryName || "غير مصنفة"} />
                <Info label="الماركة" value={item.brand || "غير محددة"} />
                <Info label="الموديل" value={item.model || "غير محدد"} />
                <Info label="السعر" value={formatMoney(item.sellingPrice ?? item.unitCost)} />
                <Info label="تكلفة الشراء" value={formatMoney(item.unitCost)} />
                <Info label="موقع التخزين" value={item.location || "المخزن الرئيسي"} />
              </CardContent>
            </Card>
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>ملخص التوفر</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SummaryCard icon={<Package className="size-5" />} label="إجمالي المتتبع" value={String(item.totalQuantity)} />
                  <SummaryCard icon={<Warehouse className="size-5" />} label="في المخزن" value={String(item.warehouseQuantity)} />
                  <SummaryCard icon={<Package className="size-5" />} label="مخصص للحالات" value={String(allocatedTotal)} />
                </div>
                {item.description && (
                  <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                    {item.description}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="on-hand" className="gap-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="on-hand">الموجود</TabsTrigger>
              <TabsTrigger value="sales">سجل البيع والاستهلاك</TabsTrigger>
            </TabsList>

            <TabsContent value="on-hand">
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>تفصيل الموجود حسب الجهة</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">المخزن الرئيسي</p>
                        <p className="text-sm text-muted-foreground">الكمية المتاحة الفعلية داخل المخزن</p>
                      </div>
                      <Badge variant="outline">{item.warehouseQuantity}</Badge>
                    </div>
                  </div>
                  {item.caseAllocations.length === 0 ? (
                    <p className="rounded-xl border bg-muted/10 p-4 text-sm text-muted-foreground">
                      لا توجد كميات مخصصة داخل حالات حالياً.
                    </p>
                  ) : (
                    item.caseAllocations.map((allocation) => (
                      <div key={`${allocation.caseId}-${allocation.handoffStatus}`} className="rounded-xl border bg-card p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-medium">
                              <Link to={`/cases/${allocation.caseId}`} className="hover:underline">
                                الحالة {allocation.caseCode}
                              </Link>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {allocation.handoffStatus === "received" ? "تم تسجيل استلام قطعة الغيار" : "تم التسليم إلى الحالة"}
                            </p>
                          </div>
                          <Badge variant="outline">الكمية: {allocation.quantity}</Badge>
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2 text-sm text-muted-foreground">
                          <p>تاريخ التسليم: {formatDate(allocation.deliveredAt)}</p>
                          <p>تاريخ الاستلام: {formatDate(allocation.receivedAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sales">
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>سجل البيع والاستهلاك</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {item.salesHistory.length === 0 ? (
                    <p className="rounded-xl border bg-muted/10 p-4 text-sm text-muted-foreground">
                      لا توجد عمليات بيع أو استهلاك مسجلة لهذه القطعة بعد.
                    </p>
                  ) : (
                    item.salesHistory.map((entry, index) => (
                      <div key={`${entry.source}-${entry.caseCode || entry.invoiceNumber || index}`} className="rounded-xl border bg-card p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-medium">
                              {entry.source === "case_repair"
                                ? `استهلاك عبر الحالة ${entry.caseCode || "-"}`
                                : `بيع مباشر ${entry.invoiceNumber || ""}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {entry.customerName || "بدون عميل محدد"} • {formatDate(entry.happenedAt)}
                            </p>
                          </div>
                          <Badge variant="outline">الكمية: {entry.quantity}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>سجل النشاط</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {item.movementHistory.length === 0 ? (
                <p className="rounded-xl border bg-muted/10 p-4 text-sm text-muted-foreground">
                  لا توجد حركة مخزون أو نشاط مسجل لهذه القطعة بعد.
                </p>
              ) : (
                item.movementHistory.map((entry) => (
                  <div key={entry.id} className="rounded-xl border bg-card p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">{getMovementLabel(entry.movementType)}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.createdByName || "مستخدم النظام"} • {formatDate(entry.createdAt)}
                        </p>
                      </div>
                      <Badge variant="outline">{entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}</Badge>
                    </div>
                    {entry.notes && <p className="mt-2 text-sm text-muted-foreground">{entry.notes}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={canEditItem && isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تحديث بيانات القطعة</DialogTitle>
            <DialogDescription>حرر بيانات المنتج الأساسية ثم احفظ التعديلات.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitEdit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="الاسم"><Input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} required /></Field>
              <Field label="الكود"><Input value={editForm.code} onChange={(event) => setEditForm((current) => ({ ...current, code: event.target.value }))} required /></Field>
              <Field label="الفئة">
                <Select value={editForm.categoryId} onValueChange={(value) => setEditForm((current) => ({ ...current, categoryId: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون فئة</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="الماركة"><Input value={editForm.brand} onChange={(event) => setEditForm((current) => ({ ...current, brand: event.target.value }))} /></Field>
              <Field label="الموديل"><Input value={editForm.model} onChange={(event) => setEditForm((current) => ({ ...current, model: event.target.value }))} /></Field>
              <Field label="الحد الأدنى"><Input type="number" min="0" value={editForm.minimumStock} onChange={(event) => setEditForm((current) => ({ ...current, minimumStock: event.target.value }))} /></Field>
              <Field label="تكلفة الشراء"><Input type="number" min="0" step="0.001" value={editForm.unitCost} onChange={(event) => setEditForm((current) => ({ ...current, unitCost: event.target.value }))} required /></Field>
              <Field label="سعر البيع"><Input type="number" min="0" step="0.001" value={editForm.sellingPrice} onChange={(event) => setEditForm((current) => ({ ...current, sellingPrice: event.target.value }))} /></Field>
              <Field label="موقع التخزين"><Input value={editForm.location} onChange={(event) => setEditForm((current) => ({ ...current, location: event.target.value }))} /></Field>
            </div>
            <Field label="الوصف"><Textarea value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} className="min-h-28" /></Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting}>حفظ التعديلات</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={canAdjustQuantity && isQuantityDialogOpen} onOpenChange={setIsQuantityDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تحديث الكمية</DialogTitle>
            <DialogDescription>
              أدخل قيمة موجبة للإضافة أو سالبة للخصم. الكمية الحالية في المخزن: {item?.warehouseQuantity ?? 0}
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitQuantityUpdate}>
            <Field label="قيمة التعديل"><Input type="number" value={quantityAdjustment} onChange={(event) => setQuantityAdjustment(event.target.value)} required /></Field>
            <Field label="ملاحظة"><Textarea value={quantityNote} onChange={(event) => setQuantityNote(event.target.value)} className="min-h-24" /></Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsQuantityDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting}>تحديث الكمية</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={canDeleteItem && isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القطعة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم أرشفة القطعة وإخفاؤها من شاشة العمل الرئيسية مع الاحتفاظ بسجل الحركة المرتبط بها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={archiveItem} disabled={isSubmitting}>تأكيد الحذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="flex items-center gap-3 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
