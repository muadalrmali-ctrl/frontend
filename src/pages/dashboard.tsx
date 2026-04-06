import { useCustom } from "@refinedev/core";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

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
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Loading dashboard data...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error.message}
        </p>
      </section>
    );
  }

  const summaryData = summary.result?.data;
  const revenueData = revenue.result?.data;
  const casesData = caseStats.result?.data ?? {};

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Current maintenance center activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total cases" value={summaryData?.totalCases} />
        <MetricCard title="Active cases" value={summaryData?.activeCases} />
        <MetricCard title="Completed cases" value={summaryData?.completedCases} />
        <MetricCard title="Revenue" value={formatCurrency(revenueData?.totalRevenue)} />
        <MetricCard title="Customers" value={summaryData?.totalCustomers} />
        <MetricCard title="Devices" value={summaryData?.totalDevices} />
        <MetricCard title="Inventory items" value={summaryData?.totalInventoryItems} />
        <MetricCard title="Low stock items" value={summaryData?.lowStockItems} />
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Cases by status</CardTitle>
          <CardDescription>Open workflow distribution.</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(casesData).length === 0 ? (
            <p className="text-sm text-muted-foreground">No case data yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(casesData).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="text-sm font-medium capitalize">
                    {status.replaceAll("_", " ")}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {String(count)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function MetricCard({
  title,
  value,
}: {
  title: string;
  value?: number | string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value ?? 0}</CardTitle>
      </CardHeader>
    </Card>
  );
}
