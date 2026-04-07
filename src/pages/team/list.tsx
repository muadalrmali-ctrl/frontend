import { useMemo } from "react";
import { useList } from "@refinedev/core";
import { Eye, Mail, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

type Technician = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt?: string | null;
};

const roleLabels: Record<string, string> = {
  technician: "فني صيانة",
  technician_manager: "مسؤول الفنيين",
};

const avatarColors = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

export function TeamPage() {
  const { result, query } = useList<Technician>({
    resource: "accounting-team",
  });
  const technicians = result.data ?? [];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">الفريق</h1>
          <p className="text-muted-foreground">
            بطاقات الفنيين المتاحين لتعيين حالات الصيانة.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {technicians.length} فنيين
        </Badge>
      </div>

      {query.isLoading && (
        <p className="text-muted-foreground">جاري تحميل الفنيين...</p>
      )}
      {query.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {query.error.message}
        </p>
      )}
      {!query.isLoading && !query.error && technicians.length === 0 && (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-muted-foreground">
          لا يوجد فنيون.
        </div>
      )}
      {!query.isLoading && !query.error && technicians.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {technicians.map((technician, index) => (
            <TechnicianCard
              key={technician.id}
              technician={technician}
              colorClass={avatarColors[index % avatarColors.length]}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TechnicianCard({
  technician,
  colorClass,
}: {
  technician: Technician;
  colorClass: string;
}) {
  const initials = useMemo(
    () =>
      technician.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join(""),
    [technician.name]
  );

  return (
    <Card className="group overflow-hidden rounded-lg border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
        <div
          className={`mb-5 flex size-24 items-center justify-center rounded-full ${colorClass} shadow-inner`}
        >
          {initials ? (
            <span className="text-2xl font-semibold">{initials}</span>
          ) : (
            <UserRound className="size-9" />
          )}
        </div>
        <h2 className="text-lg font-semibold">{technician.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {roleLabels[technician.role] ?? technician.role}
        </p>
        <div className="mt-4 flex max-w-full items-center gap-2 text-sm text-muted-foreground">
          <Mail className="size-4 shrink-0" />
          <span className="truncate">{technician.email}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t bg-muted/20 px-4 py-3 text-sm">
        <span className="text-muted-foreground">جاهز للتعيين</span>
        <Button type="button" variant="ghost" size="sm" className="gap-2">
          <Eye className="size-4" />
          عرض
        </Button>
      </CardFooter>
    </Card>
  );
}
