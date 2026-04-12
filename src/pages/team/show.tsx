import { ReactNode } from "react";
import { useOne } from "@refinedev/core";
import { ArrowRight, CheckCircle2, Clock3, Package, Phone, ShieldCheck, UserRound, Wrench } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABELS } from "@/lib/access-control";

type TeamMemberDetails = {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    phone?: string | null;
    status: string;
    joinDate?: string | null;
    specialty?: string | null;
    profilePhotoUrl?: string | null;
  };
  technicianSummary?: {
    totalCasesWorked: number;
    totalCompletedCases: number;
    totalCurrentCases: number;
    totalDelayedCases: number;
    averageRepairDurationHours?: number | null;
    completionRate?: number | null;
    delayRate?: number | null;
    lastActivityAt?: string | null;
    lastCaseWorkedOn?: {
      caseId: number;
      caseCode: string;
      customerName?: string | null;
      deviceLabel?: string | null;
    } | null;
  };
  storeManagerSummary?: {
    totalPartDeliveryActions: number;
    totalStockConfirmationActions: number;
    totalPendingConfirmations: number;
    lastActivityAt?: string | null;
  };
  currentCases?: Array<{
    id: number;
    caseCode: string;
    customerName?: string | null;
    deviceLabel?: string | null;
    status: string;
    priority: string;
    executionDueAt?: string | null;
  }>;
  completedCases?: Array<{
    id: number;
    caseCode: string;
    customerName?: string | null;
    deviceLabel?: string | null;
    completedAt?: string | null;
    finalResult?: string | null;
  }>;
  pendingConfirmations?: {
    directSales: Array<{
      id: number;
      saleCode?: string | null;
      invoiceNumber: string;
      customerName?: string | null;
      total: string;
      createdAt?: string | null;
    }>;
    pendingPartHandoffs: Array<{
      caseId: number;
      caseCode: string;
      customerName?: string | null;
      partName?: string | null;
      quantity: number;
      addedAt?: string | null;
    }>;
  };
  recentStockMovements?: Array<{
    id: number;
    movementType: string;
    quantity: number;
    itemName?: string | null;
    notes?: string | null;
    createdAt?: string | null;
  }>;
  activities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    caseId?: number | null;
    caseCode?: string | null;
    occurredAt?: string | null;
  }>;
};

const formatDate = (value?: string | null) => {
  if (!value) return "غير متوفر";
  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatPercent = (value?: number | null) => (value == null ? "غير متوفر" : `${value}%`);

const formatMoney = (value?: string | null) =>
  `${Number(value || 0).toLocaleString("ar-LY", { maximumFractionDigits: 3 })} د.ل`;

const formatDuration = (hours?: number | null) => {
  if (hours == null) return "غير متوفر";
  if (hours < 24) return `${hours} ساعة`;
  const days = hours / 24;
  return `${days.toFixed(1)} يوم`;
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    received: "مستلمة",
    diagnosis: "تشخيص",
    waiting_approval: "بانتظار موافقة وتسجيل استلام قطعة غيار",
    in_progress: "قيد التنفيذ",
    repaired: "تم الإصلاح",
    completed: "مكتملة",
    not_repairable: "غير قابلة للإصلاح",
    delivered: "تم التسليم",
    archived: "مؤرشفة",
  };
  return labels[status] || status;
};

export function TeamMemberDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const memberId = Number(id);
  const { result, query } = useOne<TeamMemberDetails>({
    resource: "accounting-team",
    id: memberId,
    queryOptions: {
      enabled: Number.isFinite(memberId),
    },
  });

  if (!Number.isFinite(memberId)) {
    return <p className="text-sm text-destructive">رقم العضو غير صالح.</p>;
  }

  const details = result;
  const role = details?.user.role;
  const isTechnician = role === "technician" || role === "technician_manager";
  const isStoreManager = role === "store_manager";
  const isSimpleRole = role === "receptionist" || role === "admin" || role === "maintenance_manager";

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <Button type="button" variant="ghost" onClick={() => navigate("/accounting/team")}>
            <ArrowRight className="size-4" />
            العودة إلى الفريق
          </Button>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={details?.user.name} imageUrl={details?.user.profilePhotoUrl || null} />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold">{details?.user.name || "تفاصيل عضو الفريق"}</h1>
                {details?.user.role ? <Badge variant="outline">{ROLE_LABELS[details.user.role as keyof typeof ROLE_LABELS] || details.user.role}</Badge> : null}
                {details?.user.status ? <Badge variant="outline">{details.user.status}</Badge> : null}
              </div>
              <p className="text-muted-foreground">
                صفحة تفصيلية لعرض بيانات عضو الفريق والأقسام المرتبطة بدوره داخل مركز الصيانة.
              </p>
            </div>
          </div>
        </div>
      </div>

      {query.isLoading ? <p className="text-muted-foreground">جارٍ تحميل بيانات عضو الفريق...</p> : null}
      {query.error ? <p className="text-sm text-destructive">{query.error.message}</p> : null}

      {details ? (
        <>
          <Card className="rounded-2xl border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>البيانات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label="الاسم الكامل" value={details.user.name} />
              <Info label="الدور" value={ROLE_LABELS[details.user.role as keyof typeof ROLE_LABELS] || details.user.role} />
              <Info label="الهاتف" value={details.user.phone || "غير متوفر"} icon={<Phone className="size-4" />} />
              <Info label="البريد الإلكتروني" value={details.user.email} />
              <Info label="الحالة" value={details.user.status} />
              <Info label="تاريخ الانضمام" value={formatDate(details.user.joinDate)} />
              {isTechnician ? <Info label="التخصص" value={details.user.specialty || "غير متوفر"} icon={<Wrench className="size-4" />} /> : null}
            </CardContent>
          </Card>

          {isTechnician && details.technicianSummary ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="إجمالي الحالات منذ الانضمام" value={String(details.technicianSummary.totalCasesWorked)} icon={<UserRound className="size-4" />} />
                <MetricCard label="الحالات المكتملة" value={String(details.technicianSummary.totalCompletedCases)} icon={<CheckCircle2 className="size-4" />} />
                <MetricCard label="الحالات الحالية" value={String(details.technicianSummary.totalCurrentCases)} icon={<Clock3 className="size-4" />} />
                <MetricCard label="الحالات المتأخرة" value={String(details.technicianSummary.totalDelayedCases)} icon={<Clock3 className="size-4" />} />
                <MetricCard label="متوسط مدة الإصلاح" value={formatDuration(details.technicianSummary.averageRepairDurationHours)} icon={<Wrench className="size-4" />} />
                <MetricCard label="آخر نشاط" value={formatDate(details.technicianSummary.lastActivityAt)} icon={<Clock3 className="size-4" />} />
                <MetricCard
                  label="آخر حالة"
                  value={details.technicianSummary.lastCaseWorkedOn?.caseCode || "غير متوفر"}
                  hint={details.technicianSummary.lastCaseWorkedOn?.deviceLabel || details.technicianSummary.lastCaseWorkedOn?.customerName || undefined}
                  icon={<Package className="size-4" />}
                />
              </div>

              <Card className="rounded-2xl border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle>الجودة والانضباط</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Info label="نسبة الإكمال" value={formatPercent(details.technicianSummary.completionRate)} />
                  <Info label="مؤشر التأخير" value={formatPercent(details.technicianSummary.delayRate)} />
                  <Info label="الحالات المعادة / المفتوحة مجددًا" value="غير متوفر" />
                  <Info label="التقييم العام" value="غير متوفر" />
                </CardContent>
              </Card>

              <Tabs defaultValue="current" className="gap-4">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="current">الحالات الحالية</TabsTrigger>
                  <TabsTrigger value="completed">الحالات المكتملة</TabsTrigger>
                </TabsList>

                <TabsContent value="current">
                  <CasesTable
                    emptyMessage="لا توجد حالات حالية مرتبطة بهذا الفني."
                    headers={["كود الحالة", "العميل", "الجهاز", "الحالة", "الأولوية", "الوقت المتوقع"]}
                    rows={(details.currentCases || []).map((entry) => [
                      <Link key={`${entry.id}-code`} to={`/cases/${entry.id}`} className="font-medium hover:underline">{entry.caseCode}</Link>,
                      entry.customerName || "غير محدد",
                      entry.deviceLabel || "غير محدد",
                      getStatusLabel(entry.status),
                      entry.priority || "غير محدد",
                      formatDate(entry.executionDueAt),
                    ])}
                  />
                </TabsContent>

                <TabsContent value="completed">
                  <CasesTable
                    emptyMessage="لا توجد حالات مكتملة لهذا الفني بعد."
                    headers={["كود الحالة", "العميل", "الجهاز", "تاريخ الإكمال", "النتيجة النهائية"]}
                    rows={(details.completedCases || []).map((entry) => [
                      <Link key={`${entry.id}-code`} to={`/cases/${entry.id}`} className="font-medium hover:underline">{entry.caseCode}</Link>,
                      entry.customerName || "غير محدد",
                      entry.deviceLabel || "غير محدد",
                      formatDate(entry.completedAt),
                      entry.finalResult || "غير محدد",
                    ])}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : null}

          {isStoreManager && details.storeManagerSummary ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="إجمالي عمليات تسليم القطع" value={String(details.storeManagerSummary.totalPartDeliveryActions)} icon={<Package className="size-4" />} />
                <MetricCard label="إجمالي تأكيدات المخزون" value={String(details.storeManagerSummary.totalStockConfirmationActions)} icon={<ShieldCheck className="size-4" />} />
                <MetricCard label="إجمالي المعاملات المعلقة" value={String(details.storeManagerSummary.totalPendingConfirmations)} icon={<Clock3 className="size-4" />} />
                <MetricCard label="آخر نشاط" value={formatDate(details.storeManagerSummary.lastActivityAt)} icon={<Clock3 className="size-4" />} />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="rounded-2xl border-border/70 bg-card/80">
                  <CardHeader>
                    <CardTitle>التأكيدات المعلقة</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="space-y-3">
                      <h3 className="font-medium">البيع المباشر بانتظار التأكيد</h3>
                      {details.pendingConfirmations?.directSales.length ? details.pendingConfirmations.directSales.map((entry) => (
                        <div key={entry.id} className="rounded-xl border bg-muted/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <Link to={`/sales/${entry.id}`} className="font-medium hover:underline">
                              {entry.saleCode || entry.invoiceNumber}
                            </Link>
                            <Badge variant="outline">{formatMoney(entry.total)}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{entry.customerName || "غير محدد"} • {formatDate(entry.createdAt)}</p>
                        </div>
                      )) : <EmptyState message="لا توجد مبيعات مباشرة معلقة." />}
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-medium">قطع بانتظار إجراء التسليم</h3>
                      {details.pendingConfirmations?.pendingPartHandoffs.length ? details.pendingConfirmations.pendingPartHandoffs.map((entry, index) => (
                        <div key={`${entry.caseId}-${entry.partName || index}`} className="rounded-xl border bg-muted/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <Link to={`/cases/${entry.caseId}`} className="font-medium hover:underline">
                              {entry.caseCode}
                            </Link>
                            <Badge variant="outline">الكمية: {entry.quantity}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{entry.customerName || "بدون عميل"} • {entry.partName || "قطعة غير محددة"} • {formatDate(entry.addedAt)}</p>
                        </div>
                      )) : <EmptyState message="لا توجد طلبات تسليم قطع معلقة." />}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/70 bg-card/80">
                  <CardHeader>
                    <CardTitle>أحدث حركات المخزون</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {details.recentStockMovements?.length ? details.recentStockMovements.map((entry) => (
                      <div key={entry.id} className="rounded-xl border bg-muted/10 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{movementLabel(entry.movementType)}</p>
                          <Badge variant="outline">{entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{[entry.itemName, entry.notes, formatDate(entry.createdAt)].filter(Boolean).join(" • ")}</p>
                      </div>
                    )) : <EmptyState message="لا توجد حركات مخزون حديثة." />}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}

          {isSimpleRole ? (
            <Card className="rounded-2xl border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle>ملخص الدور</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  تم الاكتفاء بعرض البيانات الأساسية لهذا الدور كما طُلب، بدون إضافة لوحات مؤشرات أو تحليلات إضافية.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-2xl border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>سجل النشاط</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {details.activities.length ? details.activities.map((entry) => (
                <div key={entry.id} className="rounded-xl border bg-muted/10 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{entry.title}</p>
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.caseId ? (
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link to={`/cases/${entry.caseId}`}>{entry.caseCode || "فتح الحالة"}</Link>
                        </Button>
                      ) : null}
                      <span className="text-xs text-muted-foreground">{formatDate(entry.occurredAt)}</span>
                    </div>
                  </div>
                </div>
              )) : <EmptyState message="لا توجد أنشطة حديثة لهذا العضو." />}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}

function Avatar({ name, imageUrl }: { name?: string; imageUrl?: string | null }) {
  const initials = name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border bg-muted/30 text-xl font-semibold">
      {imageUrl ? <img src={imageUrl} alt={name || "عضو الفريق"} className="h-full w-full object-cover" /> : initials || <UserRound className="size-8" />}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function CasesTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage: string;
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card/80">
      <CardContent className="p-0">
        {rows.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header} className="text-right">{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={index}>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={cellIndex}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState message={emptyMessage} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="rounded-xl border bg-muted/10 p-4 text-sm text-muted-foreground">{message}</p>;
}

function movementLabel(type: string) {
  switch (type) {
    case "delivered_to_case":
      return "تسليم قطعة إلى حالة";
    case "sold_direct":
      return "تأكيد بيع مباشر";
    case "adjustment":
      return "تحديث كمية";
    case "item_updated":
      return "تحديث بيانات قطعة";
    case "item_archived":
      return "أرشفة قطعة";
    default:
      return type;
  }
}
