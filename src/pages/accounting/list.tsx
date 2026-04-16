import { Link } from "react-router";
import type { ReactNode } from "react";
import { UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/lib/access-control";
import { getStoredUser } from "@/providers/auth-provider";

export function AccountingPage() {
  const currentUser = getStoredUser();
  const canViewCustomers = hasPermission(currentUser, "accounting.customers.view");
  const canViewTeam = hasPermission(currentUser, "accounting.team.view");

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Accounting</h1>
        <p className="text-muted-foreground">Manage accounting from this screen.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {canViewCustomers ? (
          <AccountingSectionCard
            icon={<UserRound className="size-5" />}
            title="Customers"
            description="Customer records now live inside Accounting."
            to="/accounting/customers"
            actionLabel="Open customers"
          />
        ) : null}
        {canViewTeam ? (
          <AccountingSectionCard
            icon={<Users className="size-5" />}
            title="Team"
            description="Technicians and team records are managed from Accounting."
            to="/accounting/team"
            actionLabel="Open team"
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
