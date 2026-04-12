import { useMemo, useState } from "react";
import { useCreate, useList } from "@refinedev/core";
import { Copy, Eye, Mail, Plus, UserRound, Warehouse } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/lib/access-control";

type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt?: string | null;
};

type InvitationRole = "technician" | "store_manager";

type InvitationResult = {
  id: number;
  role: InvitationRole;
  status: string;
  name?: string | null;
  phone?: string | null;
  inviteUrl: string;
  token: string;
};

const avatarColors = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

export function TeamPage() {
  const { result, query } = useList<TeamMember>({
    resource: "accounting-team",
  });
  const { mutateAsync: createInvitation, mutation } = useCreate();
  const teamMembers = result.data ?? [];
  const [inviteRole, setInviteRole] = useState<InvitationRole | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteResult, setInviteResult] = useState<InvitationResult | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const openInviteDialog = (role: InvitationRole) => {
    setInviteRole(role);
    setInviteName("");
    setInvitePhone("");
    setInviteResult(null);
    setInviteError(null);
  };

  const handleCreateInvitation = async () => {
    if (!inviteRole) return;

    try {
      setInviteError(null);
      const result = (await createInvitation({
        resource: "invitations",
        values: {
          role: inviteRole,
          name: inviteName || undefined,
          phone: invitePhone || undefined,
        },
      })) as { data: InvitationResult };

      setInviteResult(result.data);
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : "تعذر إنشاء الدعوة"
      );
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">الفريق</h1>
          <p className="text-muted-foreground">
            بطاقات الفنيين المتاحين لتعيين حالات الصيانة.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {teamMembers.length} عضو
        </Badge>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => openInviteDialog("technician")}>
            <Plus />
            إضافة فني
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => openInviteDialog("store_manager")}
          >
            <Warehouse />
            إضافة مسؤول مخزن
          </Button>
        </div>
      </div>

      {query.isLoading && (
        <p className="text-muted-foreground">جاري تحميل الفنيين...</p>
      )}
      {query.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {query.error.message}
        </p>
      )}
      {!query.isLoading && !query.error && teamMembers.length === 0 && (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-muted-foreground">
          لا يوجد فنيون.
        </div>
      )}
      {!query.isLoading && !query.error && teamMembers.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {teamMembers.map((technician, index) => (
            <TechnicianCard
              key={technician.id}
              technician={technician}
              colorClass={avatarColors[index % avatarColors.length]}
            />
          ))}
        </div>
      )}

      <Dialog open={inviteRole !== null} onOpenChange={(open) => !open && setInviteRole(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {inviteRole === "store_manager" ? "إضافة مسؤول مخزن" : "إضافة فني"}
            </DialogTitle>
            <DialogDescription>
              أنشئ رابط دعوة مؤقت، وسيقوم الموظف بإكمال البريد وكلمة المرور بنفسه.
            </DialogDescription>
          </DialogHeader>

          {!inviteResult ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="inviteName">الاسم</Label>
                <Input
                  id="inviteName"
                  value={inviteName}
                  onChange={(event) => setInviteName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invitePhone">الهاتف</Label>
                <Input
                  id="invitePhone"
                  value={invitePhone}
                  onChange={(event) => setInvitePhone(event.target.value)}
                />
              </div>
              {inviteError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {inviteError}
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              <Label htmlFor="inviteUrl">رابط الدعوة</Label>
              <div className="flex gap-2">
                <Input id="inviteUrl" readOnly value={inviteResult.inviteUrl} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigator.clipboard?.writeText(inviteResult.inviteUrl)}
                >
                  <Copy />
                  نسخ
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                أرسل هذا الرابط للموظف ليكمل التسجيل بكلمة مرور يختارها بنفسه.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInviteRole(null)}>
              إغلاق
            </Button>
            {!inviteResult && (
              <Button
                type="button"
                onClick={handleCreateInvitation}
                disabled={mutation.isPending}
              >
                إنشاء الدعوة
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TechnicianCard({
  technician,
  colorClass,
}: {
  technician: TeamMember;
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
      <Link to={`/accounting/team/${technician.id}`}>
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
          {ROLE_LABELS[technician.role as keyof typeof ROLE_LABELS] ?? technician.role}
        </p>
        <div className="mt-4 flex max-w-full items-center gap-2 text-sm text-muted-foreground">
          <Mail className="size-4 shrink-0" />
          <span className="truncate">{technician.email}</span>
        </div>
      </CardContent>
      </Link>
      <CardFooter className="flex justify-between border-t bg-muted/20 px-4 py-3 text-sm">
        <span className="text-muted-foreground">جاهز للتعيين</span>
        <Button type="button" variant="ghost" size="sm" className="gap-2" asChild>
          <Link to={`/accounting/team/${technician.id}`}>
          <Eye className="size-4" />
          عرض
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
