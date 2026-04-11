import { ChangeEvent, FormEvent, ReactNode, useMemo, useState } from "react";
import { useCreate, useList } from "@refinedev/core";
import { Grid2X2, ImageIcon, List, PackagePlus, Search, Upload } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type InventoryItem = {
  id: number;
  name: string;
  code: string;
  categoryId?: number | null;
  categoryName?: string | null;
  brand?: string | null;
  model?: string | null;
  quantity: number;
  warehouseQuantity?: number;
  totalQuantity?: number;
  minimumStock?: number | null;
  unitCost: string;
  sellingPrice?: string | null;
  imageUrl?: string | null;
  location?: string | null;
  isActive: boolean;
};

type InventoryCategory = {
  id: number;
  name: string;
};

type ViewMode = "list" | "box";

type AddItemForm = {
  name: string;
  code: string;
  categoryId: string;
  brand: string;
  quantity: string;
  price: string;
  minimumStock: string;
  imageUrl: string;
};

const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const MAX_INLINE_IMAGE_BYTES = 750_000;

const initialForm: AddItemForm = {
  name: "",
  code: "",
  categoryId: "none",
  brand: "",
  quantity: "0",
  price: "",
  minimumStock: String(DEFAULT_LOW_STOCK_THRESHOLD),
  imageUrl: "",
};

const getStockStatus = (item: InventoryItem) => {
  const displayedQuantity = item.totalQuantity ?? item.quantity;
  const minimumStock = item.minimumStock ?? DEFAULT_LOW_STOCK_THRESHOLD;

  if (displayedQuantity <= 0) {
    return {
      label: "غير متوفرة",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (displayedQuantity <= minimumStock) {
    return {
      label: "منخفضة",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "متوفرة",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
};

const formatPrice = (value?: string | null) => {
  const numericValue = Number(value ?? 0);
  if (Number.isNaN(numericValue)) return value ?? "0";

  return `${numericValue.toLocaleString("ar-LY", {
    maximumFractionDigits: 3,
  })} د.ل`;
};

export function InventoryPage() {
  const { result, query } = useList<InventoryItem>({
    resource: "inventory",
  });
  const categoriesQuery = useList<InventoryCategory>({
    resource: "inventory-categories",
  });
  const { mutateAsync: createItem, mutation } = useCreate();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [form, setForm] = useState<AddItemForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const items = result.data ?? [];
  const categories = categoriesQuery.result.data ?? [];
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return items;

    return items.filter((item) => {
      const searchable = [
        item.name,
        item.code,
        item.categoryName,
        item.categoryId ? categoriesById.get(item.categoryId) : undefined,
        item.brand,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [categoriesById, items, searchTerm]);

  const setField = <TKey extends keyof AddItemForm>(
    key: TKey,
    value: AddItemForm[TKey]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setFormError(null);
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("اختر ملف صورة فقط.");
      return;
    }

    if (file.size > MAX_INLINE_IMAGE_BYTES) {
      setFormError("الصورة كبيرة. استخدم رابط صورة أو اختر ملفا أصغر من 750KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setField("imageUrl", reader.result);
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const quantity = Number(form.quantity);
    const price = Number(form.price);
    const minimumStock = Number(form.minimumStock || DEFAULT_LOW_STOCK_THRESHOLD);

    if (!form.name.trim() || !form.code.trim()) {
      setFormError("أدخل الاسم والكود.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 0) {
      setFormError("أدخل كمية صحيحة.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setFormError("أدخل سعرا صحيحا.");
      return;
    }

    try {
      await createItem({
        resource: "inventory",
        values: {
          name: form.name.trim(),
          code: form.code.trim(),
          categoryId:
            form.categoryId === "none" ? undefined : Number(form.categoryId),
          brand: form.brand.trim() || undefined,
          quantity,
          minimumStock,
          unitCost: price,
          sellingPrice: price,
          imageUrl: form.imageUrl || undefined,
        },
      });

      await query.refetch();
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "تعذر إضافة القطعة"
      );
    }
  };

  return (
    <section className="page-shell" dir="rtl">
      <div className="page-hero flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">المخزون</h1>
          <p className="text-muted-foreground">
            إدارة قطع الغيار والمنتجات والكميات المتوفرة.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-lg border bg-card p-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
            >
              <List />
              List View
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "box" ? "default" : "ghost"}
              onClick={() => setViewMode("box")}
            >
              <Grid2X2 />
              Box View
            </Button>
          </div>
          <Button type="button" onClick={() => setIsAddDialogOpen(true)}>
            <PackagePlus />
            إضافة قطعة
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
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ابحث بالاسم أو الكود أو الفئة أو الماركة..."
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredItems.length} من {items.length} قطعة
            </p>
          </div>
        </CardContent>
      </Card>

      {query.isLoading && (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          جاري تحميل المخزون...
        </p>
      )}

      {query.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {query.error.message || "تعذر تحميل المخزون"}
        </p>
      )}

      {!query.isLoading && !query.error && filteredItems.length === 0 && (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          لا توجد قطع مطابقة.
        </p>
      )}

      {!query.isLoading && !query.error && filteredItems.length > 0 && (
        <>
          {viewMode === "list" ? (
            <InventoryListView
              items={filteredItems}
              categoriesById={categoriesById}
            />
          ) : (
            <InventoryBoxView
              items={filteredItems}
              categoriesById={categoriesById}
            />
          )}
        </>
      )}

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة قطعة</DialogTitle>
            <DialogDescription>
              أضف بيانات القطعة، وسيتم حساب الحالة تلقائيا من الكمية.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="الاسم">
                <Input
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                  required
                />
              </Field>
              <Field label="الكود">
                <Input
                  value={form.code}
                  onChange={(event) => setField("code", event.target.value)}
                  required
                />
              </Field>
              <Field label="الفئة">
                <Select
                  value={form.categoryId}
                  onValueChange={(value) => setField("categoryId", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون فئة</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="الماركة">
                <Input
                  value={form.brand}
                  onChange={(event) => setField("brand", event.target.value)}
                />
              </Field>
              <Field label="الكمية">
                <Input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(event) => setField("quantity", event.target.value)}
                  required
                />
              </Field>
              <Field label="السعر">
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.price}
                  onChange={(event) => setField("price", event.target.value)}
                  required
                />
              </Field>
              <Field label="حد التنبيه للكمية المنخفضة">
                <Input
                  type="number"
                  min="0"
                  value={form.minimumStock}
                  onChange={(event) =>
                    setField("minimumStock", event.target.value)
                  }
                />
              </Field>
              <Field label="رابط الصورة">
                <Input
                  value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
                  onChange={(event) => setField("imageUrl", event.target.value)}
                  placeholder="https://..."
                />
              </Field>
            </div>

            <div className="grid gap-3">
              <Label>صورة القطعة</Label>
              <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-[180px_1fr]">
                <ImagePreview imageUrl={form.imageUrl} name={form.name} />
                <div className="flex flex-col justify-center gap-3">
                  <Label
                    htmlFor="inventory-image"
                    className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-xs"
                  >
                    <Upload className="size-4" />
                    رفع صورة صغيرة
                  </Label>
                  <Input
                    id="inventory-image"
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    يمكن استخدام رابط صورة أو رفع صورة صغيرة مؤقتا. التخزين
                    الخارجي للصور يمكن ربطه لاحقا بدون تغيير شكل البيانات.
                  </p>
                </div>
              </div>
            </div>

            {formError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                إضافة قطعة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function InventoryListView({
  items,
  categoriesById,
}: {
  items: InventoryItem[];
  categoriesById: Map<number, string>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">الكود</TableHead>
              <TableHead className="text-right">الفئة</TableHead>
              <TableHead className="text-right">الماركة</TableHead>
              <TableHead className="text-right">الكمية</TableHead>
              <TableHead className="text-right">السعر</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const status = getStockStatus(item);
              return (
                <TableRow key={item.id}>
                  <TableCell className="min-w-56 font-medium">
                    <Link to={`/inventory/${item.id}`} className="hover:underline">
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{getCategoryName(item, categoriesById)}</TableCell>
                  <TableCell>{item.brand || "غير محددة"}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{item.totalQuantity ?? item.quantity}</p>
                      <p className="text-xs text-muted-foreground">بالمخزن: {item.warehouseQuantity ?? item.quantity}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatPrice(item.sellingPrice ?? item.unitCost)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function InventoryBoxView({
  items,
  categoriesById,
}: {
  items: InventoryItem[];
  categoriesById: Map<number, string>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((item) => {
        const status = getStockStatus(item);
        return (
          <Card key={item.id} className="overflow-hidden rounded-lg">
            <CardHeader className="space-y-3">
              <Link to={`/inventory/${item.id}`} className="space-y-3">
                <ImagePreview imageUrl={item.imageUrl ?? ""} name={item.name} />
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg leading-7">{item.name}</CardTitle>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.code}</p>
              </div>
              </Link>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <InfoRow label="الفئة" value={getCategoryName(item, categoriesById)} />
              <InfoRow label="الماركة" value={item.brand || "غير محددة"} />
              <InfoRow label="الإجمالي" value={String(item.totalQuantity ?? item.quantity)} />
              <InfoRow label="بالمخزن" value={String(item.warehouseQuantity ?? item.quantity)} />
              <InfoRow
                label="السعر"
                value={formatPrice(item.sellingPrice ?? item.unitCost)}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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

function ImagePreview({ imageUrl, name }: { imageUrl?: string; name: string }) {
  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name || "صورة القطعة"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="size-8" />
          <span className="text-sm">صورة القطعة</span>
        </div>
      )}
    </div>
  );
}

function getCategoryName(
  item: InventoryItem,
  categoriesById: Map<number, string>
) {
  return item.categoryName || (item.categoryId ? categoriesById.get(item.categoryId) : "") || "غير مصنفة";
}
