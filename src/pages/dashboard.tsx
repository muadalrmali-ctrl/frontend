import { useCustom } from "@refinedev/core";
import {
  Activity,
  Archive,
  BadgeDollarSign,
  CircleAlert,
  Cpu,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wrench,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DashboardSummary = {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  totalCustomers: number;
  totalDevices: number;
  totalInventoryItems: number;
  lowStockItems: number;
  totalInvoices: number;
  pendingInvoices: number;
};

type RevenueSummary = {
  totalRevenue: number;
};

type CaseStats = Record<string, number>;

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("ar-LY", {
    style: "currency",
    currency: "LYD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const STATUS_TONES = [
  "from-emerald-500/12 to-emerald-400/8 text-emerald-700 dark:text-emerald-300",
  "from-sky-500/12 to-sky-400/8 text-sky-700 dark:text-sky-300",
  "from-violet-500/12 to-violet-400/8 text-violet-700 dark:text-violet-300",
  "from-amber-500/12 to-amber-400/8 text-amber-700 dark:text-amber-300",
  "from-rose-500/12 to-rose-400/8 text-rose-700 dark:text-rose-300",
];

export function DashboardPage() {
  const summary = useCustom<DashboardSummary>({
    url: "/api/dashboard/summary",
    method: "get",
  });
  const revenue = useCustom<RevenueSummary>({
    url: "/api/dashboard/revenue",
    method: "get",
  });
  const caseStats = useCustom<CaseStats>({
    url: "/api/dashboard/cases",
    method: "get",
  });

  const isLoading =
    summary.query.isLoading ||
    revenue.query.isLoading ||
    caseStats.query.isLoading;
  const error =
    summary.query.error || revenue.query.error || caseStats.query.error;

  if (isLoading) {
    return (
      <section className="page-shell" dir="rtl">
        <div className="page-hero">
          <h1 className="section-title">لوحة التحكم</h1>
          <p className="section-subtitle">جاري تحميل ملخص النشاط الحالي...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-shell" dir="rtl">
        <div className="page-hero">
          <h1 className="section-title">لوحة التحكم</h1>
          <p className="section-subtitle">تعذر تحميل البيانات الحالية.</p>
          <p className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error.message}
          </p>
        </div>
      </section>
    );
  }

  const summaryData = summary.result?.data;
  const revenueData = revenue.result?.data;
  const casesData = caseStats.result?.data ?? {};

  const metrics = [
    {
      title: "إجمالي الحالات",
      value: summaryData?.totalCases,
      hint: "كل الحالات المسجلة في النظام",
      icon: <Wrench className="size-5" />,
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
    {
      title: "الحالات النشطة",
      value: summaryData?.activeCases,
      hint: "الحالات داخل الدورة التشغيلية",
      icon: <Activity className="size-5" />,
      tone: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    },
    {
      title: "الحالات المكتملة",
      value: summaryData?.completedCases,
      hint: "الإصلاحات التي أُغلقت بنجاح",
      icon: <ShieldCheck className="size-5" />,
      tone: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    },
    {
      title: "الإيرادات",
      value: formatCurrency(revenueData?.totalRevenue),
      hint: "الإجمالي المالي الحالي",
      icon: <BadgeDollarSign className="size-5" />,
      tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    },
    {
      title: "العملاء",
      value: summaryData?.totalCustomers,
      hint: "العملاء النشطون في قاعدة البيانات",
      icon: <UsersRound className="size-5" />,
      tone: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    },
    {
      title: "الأجهزة",
      value: summaryData?.totalDevices,
      hint: "الأجهزة المرتبطة بالحالات والعملاء",
      icon: <Cpu className="size-5" />,
      tone: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    },
    {
      title: "أصناف المخزون",
      value: summaryData?.totalInventoryItems,
      hint: "عدد العناصر المتاحة في المخزون",
      icon: <Archive className="size-5" />,
      tone: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    },
    {
      title: "المخزون المنخفض",
      value: summaryData?.lowStockItems,
      hint: "عناصر تحتاج متابعة وشراء",
      icon: <CircleAlert className="size-5" />,
      tone: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    },
  ];

  return (
    <section className="page-shell" dir="rtl">
      <div className="page-hero">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge className="brand-chip mb-4 border-0 shadow-none">
              <Sparkles className="size-3.5" />
              مركز القيادة اليومي
            </Badge>
            <h1 className="section-title">لوحة التحكم</h1>
            <p className="section-subtitle">
              نظرة تنفيذية سريعة على الحالات والمبيعات والمخزون حتى تكون المتابعة
              أوضح وأسرع خلال اليوم.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[430px]">
            <MiniPulseCard
              title="فواتير معلقة"
              value={summaryData?.pendingInvoices ?? 0}
              tone="text-amber-700 dark:text-amber-300"
            />
            <MiniPulseCard
              title="إجمالي الفواتير"
              value={summaryData?.totalInvoices ?? 0}
              tone="text-sky-700 dark:text-sky-300"
            />
            <MiniPulseCard
              title="معدل الإغلاق"
              value={
                summaryData?.totalCases
                  ? `${Math.round(
                      ((summaryData.completedCases ?? 0) /
                        summaryData.totalCases) *
                        100
                    )}%`
                  : "0%"
              }
              tone="text-emerald-700 dark:text-emerald-300"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-2xl">توزيع الحالات حسب الحالة</CardTitle>
            <CardDescription>
              قراءة بصرية سريعة لحركة سير العمل الحالية.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {Object.keys(casesData).length === 0 ? (
              <div className="empty-state">
                <p className="text-sm text-muted-foreground">لا توجد بيانات حالات بعد.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Object.entries(casesData).map(([status, count], index) => (
                  <div
                    key={status}
                    className={cn(
                      "rounded-[1.5rem] border border-border/65 bg-gradient-to-br px-4 py-4",
                      STATUS_TONES[index % STATUS_TONES.length]
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black capitalize">
                        {status.replaceAll("_", " ")}
                      </span>
                      <span className="rounded-full bg-white/75 px-3 py-1 text-sm font-black text-foreground shadow-xs dark:bg-slate-950/30 dark:text-foreground">
                        {String(count)}
                      </span>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/65 dark:bg-slate-950/25">
                      <div
                        className="h-full rounded-full bg-current opacity-75"
                        style={{
                          width: `${Math.max(
                            18,
                            Math.min(
                              100,
                              summaryData?.totalCases
                                ? (count / summaryData.totalCases) * 100
                                : 25
                            )
                          )}%`,
                        }}
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
            <CardDescription>
              نقاط تركيز يومية للفريق والإدارة.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <QuickInsight
              title="الحالات النشطة مقابل المكتملة"
              value={`${summaryData?.activeCases ?? 0} / ${summaryData?.completedCases ?? 0}`}
              tone="info"
            />
            <QuickInsight
              title="تنبيه مخزون"
              value={`${summaryData?.lowStockItems ?? 0} عنصر`}
              tone="warning"
            />
            <QuickInsight
              title="قيمة الإيراد"
              value={formatCurrency(revenueData?.totalRevenue)}
              tone="success"
            />
            <QuickInsight
              title="كثافة العملاء"
              value={`${summaryData?.totalCustomers ?? 0} عميل`}
              tone="violet"
            />
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
  value?: number | string;
  hint: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", tone)}>
            {icon}
          </div>
          <Badge variant="outline" className="border-border/70 bg-background/70">
            مباشر
          </Badge>
        </div>
        <p className="mt-5 text-sm font-bold text-muted-foreground">{title}</p>
        <h3 className="mt-2 text-3xl font-black tracking-tight text-foreground">
          {value ?? 0}
        </h3>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function MiniPulseCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="glass-panel rounded-[1.5rem] px-4 py-4">
      <p className="text-xs font-bold text-muted-foreground">{title}</p>
      <div className={cn("mt-3 text-2xl font-black tracking-tight", tone)}>{value}</div>
    </div>
  );
}

function QuickInsight({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "success" | "warning" | "info" | "violet";
}) {
  const badgeVariant =
    tone === "success"
      ? "success"
      : tone === "warning"
        ? "warning"
        : tone === "violet"
          ? "violet"
          : "info";

  return (
    <div className="flex items-center justify-between rounded-[1.4rem] border border-border/65 bg-background/55 px-4 py-4">
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">مقروءة مباشرة من البيانات الحالية</p>
      </div>
      <Badge variant={badgeVariant}>{value}</Badge>
    </div>
  );
}
