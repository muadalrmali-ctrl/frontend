import { Link } from "react-router";
import type { ReactNode } from "react";
import { Cpu, MapPin, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/access-control";
import { getStoredUser } from "@/providers/auth-provider";

export function AccountingPage() {
  const currentUser = getStoredUser();
  const canViewCustomers = hasPermission(currentUser, "accounting.customers.view");
  const canViewTeam = hasPermission(currentUser, "accounting.team.view");
  const canViewDevices = hasPermission(currentUser, "accounting.devices.view");
  const canViewReceptionPoints = hasPermission(currentUser, "reception_points.view");

  return (
    <section className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-semibold">المحاسبة</h1>
        <p className="text-muted-foreground">
          إدارة العملاء والفريق والأجهزة ونقاط الاستلام المرتبطة بسير عمل الصيانة.
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

        {canViewDevices ? (
          <AccountingSectionCard
            icon={<Cpu className="size-5" />}
            title="الأجهزة"
            description="مرجع الأجهزة والموديلات المسجلة داخل النظام."
            to="/accounting/devices"
            actionLabel="فتح الأجهزة"
          />
        ) : null}

        {canViewReceptionPoints ? (
          <AccountingSectionCard
            icon={<MapPin className="size-5" />}
            title="نقاط الاستلام"
            description="إدارة نقاط الاستلام الخارجية ومتابعة الحالات المرتبطة بها."
            to="/accounting/reception-points"
            actionLabel="فتح نقاط الاستلام"
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
