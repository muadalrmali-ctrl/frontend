import { ReactNode } from "react";
import { useGetIdentity, useNotification, useOne } from "@refinedev/core";
import { ArrowRight, CheckCircle2, FileText, Package2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/providers/api-client";

type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type SaleDetails = {
  invoice: {
    id: number;
    saleCode?: string | null;
    invoiceNumber: string;
    invoiceType: string;
    status: string;
    caseId?: number | null;
    caseCode?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    directCustomerName?: string | null;
    directCustomerPhone?: string | null;
    total: string;
    subtotal: string;
    discount: string;
    tax: string;
    notes?: string | null;
    saleDate?: string | null;
    createdAt?: string | null;
    createdByName?: string | null;
    confirmedAt?: string | null;
    confirmedByName?: string | null;
    deviceApplianceType?: string | null;
    deviceBrand?: string | null;
    deviceModelName?: string | null;
  };
  items: Array<{
    id: number;
    itemType: string;
    name: string;
    description?: string | null;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
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

const getSaleStatusMeta = (status: string) => {
  if (status === "paid") {
    return {
      label: "مؤكد ومكتمل",
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

export function SalesDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { open } = useNotification();
  const { data: currentUser } = useGetIdentity<CurrentUser>();
  const saleId = Number(id);
  const saleQuery = useOne<SaleDetails>({
    resource: "sales",
    id: saleId,
    queryOptions: {
      enabled: Number.isFinite(saleId),
    },
  });

  if (!Number.isFinite(saleId)) {
    return <p className="text-sm text-destructive">رقم البيع غير صالح.</p>;
  }

  const details = saleQuery.result;
  const sale = details?.invoice;
  const canConfirm = Boolean(
    sale &&
      sale.invoiceType === "direct_sale" &&
      sale.status !== "paid" &&
      (currentUser?.role === "store_manager" || currentUser?.role === "admin")
  );

  const confirmSale = async () => {
    if (!sale) return;

    try {
      await apiClient(`/api/invoices/${sale.id}/confirm`, {
        method: "PATCH",
      });
      open?.({
        type: "success",
        message: "تم تأكيد البيع",
        description: "تم خصم الكمية من المخزون وتحديث حالة البيع إلى مؤكد.",
      });
      await saleQuery.query.refetch();
    } catch (error) {
      open?.({
        type: "error",
        message: "تعذر تأكيد البيع",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع أثناء التأكيد.",
      });
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <Button type="button" variant="ghost" onClick={() => navigate("/sales")}>
            <ArrowRight className="size-4" />
            العودة إلى المبيعات
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">{sale?.saleCode || sale?.invoiceNumber || "تفاصيل البيع"}</h1>
            {sale && (
              <Badge variant="outline" className={getSaleStatusMeta(sale.status).className}>
                {getSaleStatusMeta(sale.status).label}
              </Badge>
            )}
            {sale && (
              <Badge variant="outline">
                {sale.invoiceType === "direct_sale" ? "بيع مباشر" : "بيع ناتج من صيانة"}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            صفحة تفصيلية لمراجعة بيانات البيع، البنود، العميل، حالة التأكيد، وربط الحالة إن كانت المبيعة ناتجة من عملية صيانة.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canConfirm && (
            <Button type="button" onClick={confirmSale}>
              <CheckCircle2 className="size-4" />
              تأكيد البيع وخروج المخزون
            </Button>
          )}
          {sale?.caseId ? (
            <Button type="button" variant="outline" asChild>
              <Link to={`/cases/${sale.caseId}`}>
                <FileText className="size-4" />
                فتح الحالة المرتبطة
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {saleQuery.query.isLoading ? <p className="text-muted-foreground">جارٍ تحميل البيع...</p> : null}
      {saleQuery.query.error ? <p className="text-sm text-destructive">{saleQuery.query.error.message}</p> : null}

      {sale ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-2xl border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle>ملخص البيع</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Info label="رمز البيع" value={sale.saleCode || sale.invoiceNumber} />
                <Info label="العميل" value={sale.customerName || sale.directCustomerName || "غير محدد"} />
                <Info label="الهاتف" value={sale.customerPhone || sale.directCustomerPhone || "غير محدد"} />
                <Info label="تاريخ البيع" value={formatDate(sale.saleDate || sale.createdAt)} />
                <Info label="أنشأه" value={sale.createdByName || "غير محدد"} />
                <Info label="أكدّه" value={sale.confirmedByName || "لم يتم التأكيد بعد"} />
                <Info label="تاريخ التأكيد" value={formatDate(sale.confirmedAt)} />
                <Info label="رمز الحالة" value={sale.caseCode || "-"} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle>بيانات الفاتورة</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Info label="الإجمالي الفرعي" value={formatMoney(sale.subtotal)} />
                  <Info label="الخصم" value={formatMoney(sale.discount)} />
                  <Info label="الضريبة" value={formatMoney(sale.tax)} />
                  <Info label="الإجمالي" value={formatMoney(sale.total)} />
                </div>
                {sale.invoiceType === "maintenance" ? (
                  <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                    <p>
                      هذا البيع تم تسجيله تلقائياً عند تسليم الحالة للعميل بعد اكتمال الصيانة.
                    </p>
                    {sale.deviceBrand || sale.deviceApplianceType ? (
                      <p className="mt-2">
                        الجهاز: {[sale.deviceBrand, sale.deviceApplianceType, sale.deviceModelName].filter(Boolean).join(" - ")}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                    <p>
                      البيع المباشر يبقى غير مؤكد حتى يقوم مدير المخزن بتأكيد خروج القطع من المخزون.
                    </p>
                  </div>
                )}
                {sale.notes ? (
                  <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                    {sale.notes}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>بنود البيع</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">البند</TableHead>
                      <TableHead className="text-right">الوصف</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">سعر الوحدة</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.description || "-"}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatMoney(item.unitPrice)}</TableCell>
                        <TableCell>{formatMoney(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>التتبع</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <TraceRow
                icon={<Package2 className="size-4" />}
                title="إنشاء البيع"
                description={`${sale.createdByName || "مستخدم النظام"} • ${formatDate(sale.createdAt)}`}
              />
              {sale.status === "paid" ? (
                <TraceRow
                  icon={<CheckCircle2 className="size-4" />}
                  title="تأكيد البيع وخروج المخزون"
                  description={`${sale.confirmedByName || "مستخدم النظام"} • ${formatDate(sale.confirmedAt)}`}
                />
              ) : (
                <TraceRow
                  icon={<FileText className="size-4" />}
                  title="بانتظار تأكيد المخزن"
                  description="لم يتم خصم الكمية من المخزون بعد."
                />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
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

function TraceRow({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-background p-2 text-muted-foreground">{icon}</span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
