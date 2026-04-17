import { Link } from "react-router";
import type { ReactNode } from "react";
import {
  Building2,
  Cpu,
  ReceiptText,
  ShoppingCart,
  Truck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/access-control";
import { getStoredUser } from "@/providers/auth-provider";

export function AccountingPage() {
  const currentUser = getStoredUser();
  const canViewCustomers = hasPermission(currentUser, "accounting.customers.view");
  const canViewTeam = hasPermission(currentUser, "accounting.team.view");
  const canViewSuppliers = hasPermission(currentUser, "accounting.suppliers.view");
  const canViewDevices = hasPermission(currentUser, "accounting.devices.view");
  const canViewBranches = hasPermission(currentUser, "branches.view");
  const canViewPurchases = hasPermission(currentUser, "accounting.purchases.view");
  const canViewExpenses = hasPermission(currentUser, "accounting.expenses.view");
  const canViewDailyCash = hasPermission(currentUser, "accounting.daily_cash.view");

  return (
    <section className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-semibold">المحاسبة</h1>
        <p className="text-muted-foreground">
          إدارة العملاء والفريق والموردين والأجهزة والفروع وسجل المشتريات والمصاريف
          واليومية النقدية من مكان واحد.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {canViewCustomers ? (
          <AccountingSectionCard
            icon={<UserRound className="size-5" />}
            title="العملاء"
            description="سجل العملاء وفواتيرهم والحالات المرتبطة بهم."
            to="/accounting/customers"
            actionLabel="فتح العملاء"
          />
        ) : null}

        {canViewTeam ? (
          <AccountingSectionCard
            icon={<Users className="size-5" />}
            title="الفريق"
            description="إدارة أعضاء الفريق والدعوات وصلاحيات الوصول."
            to="/accounting/team"
            actionLabel="فتح الفريق"
          />
        ) : null}

        {canViewSuppliers ? (
          <AccountingSectionCard
            icon={<Truck className="size-5" />}
            title="الموردون"
            description="إدارة الموردين وربطهم بالمشتريات والفواتير."
            to="/accounting/suppliers"
            actionLabel="فتح الموردين"
          />
        ) : null}

        {canViewDevices ? (
          <AccountingSectionCard
            icon={<Cpu className="size-5" />}
            title="الأجهزة"
            description="مرجع الأجهزة والموديلات المسجلة داخل النظام."
            to="/accounting/devices"
            actionLabel="فتح الأجهزة"
          />
        ) : null}

        {canViewBranches ? (
          <AccountingSectionCard
            icon={<Building2 className="size-5" />}
            title="الفروع"
            description="إدارة الفروع ومتابعة الحالات القادمة من كل فرع."
            to="/accounting/branches"
            actionLabel="فتح الفروع"
          />
        ) : null}

        {canViewPurchases ? (
          <AccountingSectionCard
            icon={<ShoppingCart className="size-5" />}
            title="المشتريات"
            description="سجل مشتريات الموردين وتأكيد إدخال العناصر إلى المخزون."
            to="/accounting/purchases"
            actionLabel="فتح المشتريات"
          />
        ) : null}

        {canViewExpenses ? (
          <AccountingSectionCard
            icon={<ReceiptText className="size-5" />}
            title="المصاريف اليومية"
            description="المصاريف التشغيلية اليومية والإيصالات المرتبطة بها."
            to="/accounting/daily-expenses"
            actionLabel="فتح المصاريف"
          />
        ) : null}

        {canViewDailyCash ? (
          <AccountingSectionCard
            icon={<Wallet className="size-5" />}
            title="اليومية النقدية"
            description="التحصيل اليومي قبل تسليمه إلى الخزينة أو الإدارة."
            to="/accounting/daily-cash"
            actionLabel="فتح اليومية النقدية"
          />
        ) : null}
      </div>
    </section>
  );
}

function AccountingSectionCard({
  icon,
  title,
  description,
  to,
  actionLabel,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  to: string;
  actionLabel: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button asChild variant="outline">
          <Link to={to}>{actionLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
