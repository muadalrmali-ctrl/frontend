import { useEffect, useMemo, useRef, useState } from "react";
import { useNotification } from "@refinedev/core";
import { Download, FileSpreadsheet, FileText, Filter, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportElementToPdf, exportReportToExcel } from "@/lib/report-export";
import { apiClient } from "@/providers/api-client";

type ReportCategory = "cases" | "technicians" | "inventory" | "sales" | "customers" | "operations";

type FilterOption = {
  value: string;
  label: string;
};

type ReportDefinition = {
  label: string;
  description: string;
  reports: FilterOption[];
  supportsStatus?: boolean;
  supportsTechnician?: boolean;
  supportsProduct?: boolean;
  supportsCustomer?: boolean;
};

type ReportResponse = {
  category: ReportCategory;
  reportType: string;
  title: string;
  generatedAt: string;
  filters: Record<string, string>;
  columns: Array<{ key: string; label: string }>;
  rows: Record<string, unknown>[];
  summary: Array<{ label: string; value: string | number }>;
};

type ReportsMeta = {
  technicians: Array<{ id: number; name: string }>;
  products: Array<{ id: number; name: string; code: string }>;
  customers: Array<{ id: number; name: string; phone: string }>;
};

const REPORT_DEFINITIONS: Record<ReportCategory, ReportDefinition> = {
  cases: {
    label: "تقارير الحالات",
    description: "تقارير تشغيلية عن الحالات المفتوحة والمغلقة والتأخير والتوزيع.",
    supportsStatus: true,
    supportsTechnician: true,
    supportsCustomer: true,
    reports: [
      { value: "all_cases", label: "جميع الحالات" },
      { value: "open_cases", label: "الحالات المفتوحة" },
      { value: "completed_cases", label: "الحالات المكتملة" },
      { value: "delayed_cases", label: "الحالات المتأخرة" },
      { value: "cases_by_status", label: "الحالات حسب الحالة" },
      { value: "cases_by_technician", label: "الحالات حسب الفني" },
      { value: "cases_by_device_type", label: "الحالات حسب نوع الجهاز" },
      { value: "waiting_approval", label: "بانتظار الموافقة" },
      { value: "waiting_part", label: "بانتظار القطعة" },
      { value: "repaired_cases", label: "تم إصلاحها" },
      { value: "not_repairable_cases", label: "غير قابلة للإصلاح" },
      { value: "by_case_type", label: "داخلية مقابل خارجية" },
    ],
  },
  technicians: {
    label: "تقارير الفنيين",
    description: "تقارير الأداء والإكمال والحالات الحالية والمتأخرة لكل فني.",
    supportsTechnician: true,
    reports: [{ value: "performance", label: "تقرير أداء الفنيين" }],
  },
  inventory: {
    label: "تقارير المخزون والقطع",
    description: "حالة المخزون الحالية وحركاته والعهدة والمرتجعات والاستهلاك.",
    supportsProduct: true,
    reports: [
      { value: "current_inventory", label: "المخزون الحالي" },
      { value: "low_stock", label: "المخزون المنخفض" },
      { value: "out_of_stock", label: "غير متوفر" },
      { value: "stock_movements", label: "حركات المخزون" },
      { value: "case_allocations", label: "العهدة / التخصيص للحالات" },
      { value: "returned_parts", label: "القطع المعادة" },
      { value: "most_used_parts", label: "أكثر القطع استخداماً" },
    ],
  },
  sales: {
    label: "تقارير المبيعات",
    description: "تقارير المبيعات المباشرة ومبيعات الصيانة والتأكيد والأصناف الأكثر بيعاً.",
    supportsCustomer: true,
    supportsProduct: true,
    reports: [
      { value: "all_sales", label: "جميع المبيعات" },
      { value: "direct_sales", label: "المبيعات المباشرة" },
      { value: "maintenance_sales", label: "مبيعات الصيانة" },
      { value: "confirmed_sales", label: "المبيعات المؤكدة" },
      { value: "unconfirmed_sales", label: "المبيعات غير المؤكدة" },
      { value: "top_items", label: "أعلى الأصناف مبيعاً" },
    ],
  },
  customers: {
    label: "تقارير العملاء",
    description: "تقارير العملاء حسب الحالات والإنفاق والحالات المفتوحة والعملاء الجدد.",
    supportsCustomer: true,
    reports: [
      { value: "all_customers", label: "جميع العملاء" },
      { value: "by_cases_count", label: "حسب عدد الحالات" },
      { value: "with_open_cases", label: "ذوو الحالات المفتوحة" },
      { value: "new_customers", label: "العملاء الجدد" },
      { value: "by_total_spend", label: "حسب إجمالي الإنفاق" },
    ],
  },
  operations: {
    label: "تقارير التشغيل وسير العمل",
    description: "نشاط يومي وأسبوعي وشهري مع الموافقات والتسليمات المعلقة والتأخير.",
    supportsProduct: true,
    reports: [
      { value: "daily_activity", label: "النشاط اليومي" },
      { value: "weekly_activity", label: "النشاط الأسبوعي" },
      { value: "monthly_activity", label: "النشاط الشهري" },
      { value: "approvals_pending", label: "الموافقات المعلقة" },
      { value: "spare_part_handoff_pending", label: "تسليم واستلام القطع المعلق" },
      { value: "delayed_workflow", label: "تأخير سير العمل" },
    ],
  },
};

const STATUS_OPTIONS: FilterOption[] = [
  { value: "received", label: "حالة جديدة" },
  { value: "waiting_part", label: "بانتظار القطعة" },
  { value: "diagnosing", label: "قيد التشخيص" },
  { value: "waiting_approval", label: "بانتظار الموافقة" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "repaired", label: "تم الإصلاح" },
  { value: "not_repairable", label: "غير قابلة للإصلاح" },
  { value: "completed", label: "مكتملة" },
];

const formatDateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "-";

const formatCellValue = (value: unknown) => {
  if (value == null || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString("ar-LY");
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "-";
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return formatDateTime(trimmed);
    return trimmed;
  }
  return String(value);
};

const getDefaultReportType = (category: ReportCategory) => REPORT_DEFINITIONS[category].reports[0]?.value || "";

const today = new Date();
const defaultDateTo = today.toISOString().slice(0, 10);
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

export function ReportsPage() {
  const { open } = useNotification();
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [category, setCategory] = useState<ReportCategory>("cases");
  const [reportType, setReportType] = useState(getDefaultReportType("cases"));
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [status, setStatus] = useState("all");
  const [technicianId, setTechnicianId] = useState("all");
  const [productId, setProductId] = useState("all");
  const [customerId, setCustomerId] = useState("all");
  const [meta, setMeta] = useState<ReportsMeta | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryDefinition = REPORT_DEFINITIONS[category];

  useEffect(() => {
    let isMounted = true;
    setIsLoadingMeta(true);
    apiClient<ReportsMeta>("/api/reports/meta")
      .then((data) => {
        if (isMounted) setMeta(data);
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError instanceof Error ? requestError.message : "تعذر تحميل بيانات التقارير");
      })
      .finally(() => {
        if (isMounted) setIsLoadingMeta(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setReportType(getDefaultReportType(category));
    setStatus("all");
    setTechnicianId("all");
    setProductId("all");
    setCustomerId("all");
  }, [category]);

  const technicianOptions = meta?.technicians ?? [];
  const productOptions = meta?.products ?? [];
  const customerOptions = meta?.customers ?? [];

  const appliedFilters = useMemo(
    () => ({
      category,
      reportType,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: status !== "all" ? status : undefined,
      technicianId: technicianId !== "all" ? technicianId : undefined,
      productId: productId !== "all" ? productId : undefined,
      customerId: customerId !== "all" ? customerId : undefined,
    }),
    [category, reportType, dateFrom, dateTo, status, technicianId, productId, customerId]
  );

  const runReport = async () => {
    setError(null);
    setIsLoadingReport(true);
    try {
      const data = await apiClient<ReportResponse>("/api/reports", {
        query: appliedFilters,
      });
      setReport(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر إنشاء التقرير");
      setReport(null);
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    void runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportExcel = () => {
    if (!report) return;
    exportReportToExcel(report, `report-${report.category}-${report.reportType}`);
    open?.({ type: "success", message: "تم تصدير Excel", description: "تم إنشاء ملف Excel للتقرير الحالي." });
  };

  const exportPdf = async () => {
    if (!report || !reportRef.current) return;
    setIsExportingPdf(true);
    try {
      await exportElementToPdf(reportRef.current, `report-${report.category}-${report.reportType}`);
      open?.({ type: "success", message: "تم تصدير PDF", description: "تم إنشاء ملف PDF للتقرير الحالي." });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تصدير PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const applyPreset = (preset: "today" | "week" | "month" | "year") => {
    const now = new Date();
    const toValue = now.toISOString().slice(0, 10);
    let fromValue = toValue;

    if (preset === "week") {
      const date = new Date(now);
      date.setDate(date.getDate() - 6);
      fromValue = date.toISOString().slice(0, 10);
    } else if (preset === "month") {
      fromValue = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    } else if (preset === "year") {
      fromValue = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    }

    setDateFrom(fromValue);
    setDateTo(toValue);
  };

  return (
    <section className="page-shell" dir="rtl">
      <div className="page-hero space-y-2">
        <h1 className="text-3xl font-semibold">التقارير</h1>
        <p className="text-muted-foreground">
          مركز موحد لتقارير الحالات والفنيين والمخزون والمبيعات والعملاء وسير العمل، مع تصدير PDF وExcel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(Object.entries(REPORT_DEFINITIONS) as Array<[ReportCategory, ReportDefinition]>).map(([key, definition]) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            className={`rounded-2xl border p-5 text-right transition ${category === key ? "border-primary bg-primary/5" : "border-border/70 bg-card/80 hover:border-primary/40"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{definition.label}</h2>
              <Badge variant={category === key ? "default" : "outline"}>{definition.reports.length} تقرير</Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{definition.description}</p>
          </button>
        ))}
      </div>

      <Card className="rounded-2xl border-border/70 bg-card/80">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Filter className="size-5" />
            إعدادات التقرير
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("today")}>اليوم</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("week")}>آخر 7 أيام</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("month")}>هذا الشهر</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("year")}>هذه السنة</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="فئة التقرير">
              <Select value={category} onValueChange={(value) => setCategory(value as ReportCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(REPORT_DEFINITIONS) as Array<[ReportCategory, ReportDefinition]>).map(([key, definition]) => (
                    <SelectItem key={key} value={key}>{definition.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="نوع التقرير">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryDefinition.reports.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="من تاريخ">
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </Field>

            <Field label="إلى تاريخ">
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </Field>

            {categoryDefinition.supportsStatus ? (
              <Field label="الحالة">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            {categoryDefinition.supportsTechnician ? (
              <Field label="الفني">
                <Select value={technicianId} onValueChange={setTechnicianId} disabled={isLoadingMeta}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الفنيين</SelectItem>
                    {technicianOptions.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>{option.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            {categoryDefinition.supportsProduct ? (
              <Field label="القطعة / المنتج">
                <Select value={productId} onValueChange={setProductId} disabled={isLoadingMeta}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل القطع</SelectItem>
                    {productOptions.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>{option.name} - {option.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            {categoryDefinition.supportsCustomer ? (
              <Field label="العميل">
                <Select value={customerId} onValueChange={setCustomerId} disabled={isLoadingMeta}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل العملاء</SelectItem>
                    {customerOptions.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>{option.name} - {option.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={runReport} disabled={isLoadingReport || isLoadingMeta}>
              {isLoadingReport ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              عرض التقرير
            </Button>
            <Button type="button" variant="outline" onClick={exportPdf} disabled={!report || isExportingPdf}>
              {isExportingPdf ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              تصدير PDF
            </Button>
            <Button type="button" variant="outline" onClick={exportExcel} disabled={!report}>
              <FileSpreadsheet className="size-4" />
              تصدير Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div ref={reportRef} className="space-y-6 rounded-2xl bg-white p-4 text-slate-900 shadow-sm">
        {report ? (
          <>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">{report.title}</h2>
                <Badge variant="outline" className="border-slate-300 text-slate-700">
                  {formatDateTime(report.generatedAt)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                {Object.entries(report.filters).map(([label, value]) => (
                  <span key={label} className="rounded-full bg-slate-100 px-3 py-1">
                    {label}: {value}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {report.summary.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCellValue(item.value)}</p>
                </div>
              ))}
            </div>

            <Card className="rounded-2xl border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-200 pb-4">
                <CardTitle className="text-slate-900">نتائج التقرير</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {report.rows.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500">لا توجد بيانات مطابقة للفلاتر الحالية.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {report.columns.map((column) => (
                            <TableHead key={column.key} className="text-right text-slate-600">
                              {column.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.rows.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {report.columns.map((column) => (
                              <TableCell key={column.key} className="text-right align-top">
                                {formatCellValue(row[column.key])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            {isLoadingReport ? "جارٍ تجهيز التقرير..." : "اختر نوع التقرير واضغط عرض التقرير."}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
