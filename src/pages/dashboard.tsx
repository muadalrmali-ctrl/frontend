import { useCustom } from "@refinedev/core";
import type { ReactNode } from "react";
import {
  Activity,
  Archive,
  BadgeDollarSign,
  CircleAlert,
  ClipboardList,
  Clock3,
  Cpu,
  Inbox,
  ShieldCheck,
  UsersRound,
  Wrench,
} from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardSummary = {
  casesByStatus: Record<string, number>;
  totalCases: number;
  newCases: number;
  diagnosingCases: number;
  waitingApprovalCases: number;
  inProgressCases: number;
  repairedCases: number;
  notRepairableCases: number;
  completedOperations: number;
  incomingReceptionPointCases: number;
  maintenanceOperationsCount: number;
  inventorySummary: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
  };
  salesSummary: {
    totalRevenue: number;
    totalInvoices: number;
    pendingInvoices: number;
  };
  totalCustomers: number;
  totalDevices: number;
  recentCases: Array<{
    id: number;
    caseCode: string;
    status: string;
    customerName: string | null;
    deviceLabel: string | null;
    receptionPointName: string | null;
    createdAt: string | null;
  }>;
  recentActivities: Array<{
    id: number;
    caseId: number | null;
    caseCode: string | null;
    title: string;
    actorName: string | null;
    createdAt: string | null;
  }>;
};

const statusLabels: Record<string, string> = {
  received: "حالة جديدة",
  new: "حالة جديدة",
  waiting_part: "بانتظار قطعة",
  diagnosis: "قيد التشخيص",
  diagnosing: "قيد التشخيص",
  waiting_approval: "بانتظار الموافقة",
  in_progress: "قيد التنفيذ",
  repaired: "تم الإصلاح",
  not_repairable: "لا يمكن إصلاحها",
  completed: "عملية منتهية",
  delivered: "تم التسليم",
  in_transit_to_main_center: "قيد النقل إلى المركز",
};

const statusTones = [
  "bg-emerald-50 text-emerald-700 border-emerald-100",
  "bg-sky-50 text-sky-700 border-sky-100",
  "bg-violet-50 text-violet-700 border-violet-100",
  "bg-amber-50 text-amber-700 border-amber-100",
  "bg-rose-50 text-rose-700 border-rose-100",
];

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("ar-LY", {
    style: "currency",
    currency: "LYD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const formatDate = (value?: string | null) => {
  if (!value) return "غير متوفر";
  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export function DashboardPage() {
  const summary = useCustom<DashboardSummary>({
    url: "/api/dashboard/summary",
    method: "get",
  });

  const data = summary.result?.data;

  if (summary.query.isLoading) {
    return (
      <section className="page-shell" dir="rtl">
        <div className="page-hero">
          <h1 className="section-title">لوحة التحكم</h1>
          <p className="section-subtitle">جاري تحميل بيانات النظام الحالية...</p>
        </div>
      </section>
    );
  }

  if (summary.query.error || !data) {
    return (
      <section className="page-shell" dir="rtl">
        <div className="page-hero">
          <h1 className="section-title">لوحة التحكم</h1>
          <p className="section-subtitle">تعذر تحميل بيانات لوحة التحكم.</p>
          {summary.query.error ? (
            <p className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {summary.query.error.message}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  const metrics = [
    {
      title: "إجمالي الحالات",
      value: data.totalCases,
      hint: "كل الحالات المسجلة حسب صلاحيات المستخدم",
      icon: <ClipboardList className="size-5" />,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "حالات جديدة",
      value: data.newCases,
      hint: "حالات لم تبدأ مرحلة التشخيص بعد",
      icon: <Wrench className="size-5" />,
      tone: "bg-sky-100 text-sky-700",
    },
    {
      title: "قيد التشخيص",
      value: data.diagnosingCases,
      hint: "حالات داخل مرحلة الفحص والتقدير",
      icon: <Activity className="size-5" />,
      tone: "bg-violet-100 text-violet-700",
    },
    {
      title: "بانتظار الموافقة",
      value: data.waitingApprovalCases,
      hint: "حالات تنتظر موافقة العميل",
      icon: <Clock3 className="size-5" />,
      tone: "bg-amber-100 text-amber-700",
    },
    {
      title: "قيد التنفيذ",
      value: data.inProgressCases,
      hint: "حالات يجري العمل عليها الآن",
      icon: <Wrench className="size-5" />,
      tone: "bg-indigo-100 text-indigo-700",
    },
    {
      title: "تم الإصلاح",
      value: data.repairedCases,
      hint: "حالات جاهزة أو بانتظار التسليم",
      icon: <ShieldCheck className="size-5" />,
      tone: "bg-teal-100 text-teal-700",
    },
    {
      title: "لا يمكن إصلاحها",
      value: data.notRepairableCases,
      hint: "حالات انتهت بعدم إمكانية الإصلاح",
      icon: <CircleAlert className="size-5" />,
      tone: "bg-rose-100 text-rose-700",
    },
    {
      title: "استلام نقاط الاستلام",
      value: data.incomingReceptionPointCases,
      hint: "حالات مرسلة للمركز ولم تستلم بعد",
      icon: <Inbox className="size-5" />,
      tone: "bg-lime-100 text-lime-700",
    },
  ];

  const quickStats = [
    { title: "عمليات الصيانة", value: data.maintenanceOperationsCount, icon: <Wrench className="size-4" /> },
    { title: "العمليات المنتهية", value: data.completedOperations, icon: <ShieldCheck className="size-4" /> },
    { title: "العملاء", value: data.totalCustomers, icon: <UsersRound className="size-4" /> },
    { title: "الأجهزة", value: data.totalDevices, icon: <Cpu className="size-4" /> },
    { title: "أصناف المخزون", value: data.inventorySummary.totalItems, icon: <Archive className="size-4" /> },
    { title: "مخزون منخفض", value: data.inventorySummary.lowStockItems, icon: <CircleAlert className="size-4" /> },
    { title: "فواتير معلقة", value: data.salesSummary.pendingInvoices, icon: <BadgeDollarSign className="size-4" /> },
    { title: "إجمالي الإيراد", value: formatCurrency(data.salesSummary.totalRevenue), icon: <BadgeDollarSign className="size-4" /> },
  ];

  return (
    <section className="page-shell" dir="rtl">
      <div className="page-hero">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge className="brand-chip mb-4 border-0 shadow-none">بيانات مباشرة</Badge>
            <h1 className="section-title">لوحة التحكم</h1>
            <p className="section-subtitle">
              ملخص حي للحالات والاستلام والمخزون والمبيعات حسب صلاحيات المستخدم الحالية.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[430px]">
            <MiniStat title="إجمالي الفواتير" value={data.salesSummary.totalInvoices} />
            <MiniStat title="منخفض المخزون" value={data.inventorySummary.lowStockItems} />
            <MiniStat title="نفد من المخزون" value={data.inventorySummary.outOfStockItems} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-2xl">توزيع الحالات</CardTitle>
            <CardDescription>الأرقام المعروضة تأتي من قاعدة البيانات الحالية.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {Object.keys(data.casesByStatus).length === 0 ? (
              <EmptyState message="لا توجد حالات مسجلة بعد." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Object.entries(data.casesByStatus).map(([status, count], index) => (
                  <div key={status} className={cn("rounded-lg border px-4 py-4", statusTones[index % statusTones.length])}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold">{statusLabels[status] ?? status.replaceAll("_", " ")}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-foreground shadow-2xs">{count}</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
                      <div
                        className="h-full rounded-full bg-current opacity-75"
                        style={{ width: `${data.totalCases ? Math.max(10, (count / data.totalCases) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-2xl">مؤشرات سريعة</CardTitle>
            <CardDescription>ملخصات تشغيلية من البيانات الفعلية.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-6">
            {quickStats.map((item) => (
              <div key={item.title} className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-bold">
                  {item.icon}
                  {item.title}
                </div>
                <Badge variant="outline">{item.value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-2xl">أحدث الحالات</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-6">
            {data.recentCases.length ? data.recentCases.map((caseItem) => (
              <Link key={caseItem.id} to={`/cases/${caseItem.id}`} className="rounded-lg border bg-background p-4 transition hover:border-primary/40">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold">{caseItem.caseCode}</span>
                  <Badge variant="secondary">{statusLabels[caseItem.status] ?? caseItem.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {[caseItem.customerName, caseItem.deviceLabel, caseItem.receptionPointName].filter(Boolean).join(" • ") || "بيانات غير مكتملة"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDate(caseItem.createdAt)}</p>
              </Link>
            )) : <EmptyState message="لا توجد حالات حديثة." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-2xl">آخر النشاطات</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-6">
            {data.recentActivities.length ? data.recentActivities.map((activity) => (
              <div key={activity.id} className="rounded-lg border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">{activity.title}</p>
                  {activity.caseId ? <Badge variant="outline">{activity.caseCode}</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {[activity.actorName, formatDate(activity.createdAt)].filter(Boolean).join(" • ")}
                </p>
              </div>
            )) : <EmptyState message="لا توجد نشاطات حديثة." />}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  hint,
  icon,
  tone,
}: {
  title: string;
  value: number | string;
  hint: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", tone)}>{icon}</div>
        </div>
        <p className="mt-5 text-sm font-bold text-muted-foreground">{title}</p>
        <h3 className="mt-2 text-3xl font-black tracking-tight text-foreground">{value}</h3>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-4 shadow-2xs">
      <p className="text-xs font-bold text-muted-foreground">{title}</p>
      <div className="mt-3 text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">{message}</p>;
}
