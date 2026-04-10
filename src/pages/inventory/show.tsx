import { useMemo } from "react";
import { useOne } from "@refinedev/core";
import { ArrowRight, Package, Warehouse } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProductDetails = {
  id: number;
  name: string;
  code: string;
  categoryName?: string | null;
  brand?: string | null;
  model?: string | null;
  quantity: number;
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

export function InventoryDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const productId = Number(id);
  const { result, query } = useOne<ProductDetails>({
    resource: "inventory",
    id: productId,
    queryOptions: {
      enabled: Number.isFinite(productId),
    },
  });

  const item = result ?? null;
  const allocatedTotal = useMemo(
    () => (item?.caseAllocations ?? []).reduce((sum: number, entry: ProductDetails["caseAllocations"][number]) => sum + Number(entry.quantity || 0), 0),
    [item?.caseAllocations]
  );

  if (!Number.isFinite(productId)) {
    return <p className="text-sm text-destructive">رقم القطعة غير صالح.</p>;
  }

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
              <Badge variant="outline" className={getStockTone(item.warehouseQuantity, item.minimumStock)}>
                الموجود بالمخزن: {item.warehouseQuantity}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-muted-foreground">
            صفحة تفصيلية لعرض بيانات القطعة، أماكن تواجدها الحالية، وحركة الاستهلاك أو البيع.
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
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>نظرة عامة</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Info label="اسم القطعة" value={item.name} />
                <Info label="الكود / SKU" value={item.code} />
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
              <TabsTrigger value="sales">تم البيع</TabsTrigger>
              <TabsTrigger value="activity">الحركة</TabsTrigger>
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
                        <p className="text-sm text-muted-foreground">الكمية المتاحة الفعلية في المخزن</p>
                      </div>
                      <Badge variant="outline">{item.warehouseQuantity}</Badge>
                    </div>
                  </div>
                  {item.caseAllocations.length === 0 ? (
                    <p className="rounded-xl border bg-muted/10 p-4 text-sm text-muted-foreground">
                      لا توجد كميات مخصصة داخل حالات حالياً.
                    </p>
                  ) : (
                    item.caseAllocations.map((allocation: ProductDetails["caseAllocations"][number]) => (
                      <div key={`${allocation.caseId}-${allocation.handoffStatus}`} className="rounded-xl border bg-card p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-medium">
                              <Link to={`/cases/${allocation.caseId}`} className="hover:underline">
                                الحالة {allocation.caseCode}
                              </Link>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {allocation.handoffStatus === "received" ? "تم استلامها من الفني" : "تم تسليمها من المخزن"}
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
                    item.salesHistory.map((entry: ProductDetails["salesHistory"][number], index: number) => (
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

            <TabsContent value="activity">
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>الحركة الأخيرة</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {item.movementHistory.length === 0 ? (
                    <p className="rounded-xl border bg-muted/10 p-4 text-sm text-muted-foreground">
                      لا توجد حركة مخزون مسجلة لهذه القطعة بعد.
                    </p>
                  ) : (
                    item.movementHistory.map((entry: ProductDetails["movementHistory"][number]) => (
                      <div key={entry.id} className="rounded-xl border bg-card p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-medium">{entry.movementType}</p>
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
            </TabsContent>
          </Tabs>
        </>
      )}
    </section>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
