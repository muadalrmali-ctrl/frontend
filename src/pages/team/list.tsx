import { useMemo, useState } from "react";
import { useCreate, useList } from "@refinedev/core";
import { Copy, Eye, Link2, Mail, Plus, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  canManageInvitations,
  canViewInvitations,
  getAllowedInvitationRoles,
  ROLE_LABELS,
  type AppRole,
} from "@/lib/access-control";
import { apiClient } from "@/providers/api-client";
import { getStoredUser } from "@/providers/auth-provider";

type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt?: string | null;
};

type InvitationRecord = {
  id: number;
  role: AppRole;
  status: "pending" | "used" | "expired" | "revoked";
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  inviteUrl?: string | null;
  expiresAt: string;
  createdAt?: string | null;
};

type BranchOption = {
  id: number;
  name: string;
};

type InvitationFormState = {
  role: AppRole;
  branchId: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  expiresInDays: string;
};

const avatarColors = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

const statusLabels: Record<InvitationRecord["status"], string> = {
  pending: "قيد الانتظار",
  used: "مستخدمة",
  expired: "منتهية",
  revoked: "ملغاة",
};

const statusVariants: Record<
  InvitationRecord["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "default",
  used: "secondary",
  expired: "outline",
  revoked: "destructive",
};

const formatDate = (value?: string | null) => {
  if (!value) return "غير متوفر";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const resolveInviteUrl = (value?: string | null) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${window.location.origin}${value.startsWith("/") ? value : `/${value}`}`;
};

export function TeamPage() {
  const currentRole = getStoredUser()?.role ?? null;
  const canManage = canManageInvitations(currentRole);
  const canView = canViewInvitations(currentRole);
  const allowedRoles = getAllowedInvitationRoles(currentRole);
  const defaultRole = allowedRoles[0] ?? "technician";

  const { result, query } = useList<TeamMember>({
    resource: "accounting-team",
  });
  const {
    result: invitationsResult,
    query: invitationsQuery,
  } = useList<InvitationRecord>({
    resource: "invitations",
    queryOptions: {
      enabled: canView,
    },
  });
  const branchesQuery = useList<BranchOption>({
    resource: "branches",
    queryOptions: {
      enabled: canManage,
    },
  });
  const { mutateAsync: createInvitation, mutation } = useCreate();

  const teamMembers = result.data ?? [];
  const invitations = useMemo(() => invitationsResult.data ?? [], [invitationsResult.data]);
  const branches = useMemo(() => branchesQuery.result.data ?? [], [branchesQuery.result.data]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<InvitationRecord | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [form, setForm] = useState<InvitationFormState>({
    role: defaultRole,
    branchId: "",
    name: "",
    email: "",
    phone: "",
    notes: "",
    expiresInDays: "7",
  });

  const isBranchUserRole = form.role === "branch_user";

  const openInviteDialog = () => {
    setForm({
      role: defaultRole,
      branchId: "",
      name: "",
      email: "",
      phone: "",
      notes: "",
      expiresInDays: "7",
    });
    setInviteError(null);
    setInviteResult(null);
    setIsDialogOpen(true);
  };

  const handleCreateInvitation = async () => {
    try {
      setInviteError(null);

      if (isBranchUserRole && !form.branchId) {
        setInviteError("اختر الفرع قبل إنشاء دعوة مستخدم الفرع.");
        return;
      }

      const response = (await createInvitation({
        resource: "invitations",
        values: {
          role: form.role,
          branchId: isBranchUserRole ? Number(form.branchId) : undefined,
          name: form.name || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
          expiresInDays: Number(form.expiresInDays || 7),
        },
      })) as { data: InvitationRecord };

      setInviteResult(response.data);
      invitationsQuery.refetch();
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "تعذر إنشاء الدعوة");
    }
  };

  const handleRevokeInvitation = async (invitationId: number) => {
    try {
      setRevokingId(invitationId);
      await apiClient(`/api/invitations/${invitationId}/revoke`, {
        method: "PATCH",
      });
      invitationsQuery.refetch();
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "تعذر إلغاء الدعوة");
    } finally {
      setRevokingId(null);
    }
  };

  const pendingInvitationsCount = useMemo(
    () => invitations.filter((invitation) => invitation.status === "pending").length,
    [invitations]
  );

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">الفريق والدعوات</h1>
          <p className="text-muted-foreground">
            إدارة أعضاء الفريق الحاليين وإنشاء روابط دعوات صالحة للتسجيل الذاتي.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{teamMembers.length} عضو في الفريق</Badge>
          {canView ? <Badge variant="outline">{pendingInvitationsCount} دعوة نشطة</Badge> : null}
          {canManage ? (
            <Button type="button" onClick={openInviteDialog}>
              <Plus className="size-4" />
              إنشاء دعوة جديدة
            </Button>
          ) : null}
        </div>
      </div>

      {query.isLoading ? <p className="text-muted-foreground">جارٍ تحميل أعضاء الفريق...</p> : null}
      {query.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {query.error.message}
        </p>
      ) : null}

      {!query.isLoading && !query.error && teamMembers.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-muted-foreground">
          لا يوجد أعضاء في الفريق حاليًا.
        </div>
      ) : null}

      {!query.isLoading && !query.error && teamMembers.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {teamMembers.map((member, index) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              colorClass={avatarColors[index % avatarColors.length]}
            />
          ))}
        </div>
      ) : null}

      {canView ? (
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-5" />
              إدارة الدعوات
            </CardTitle>
            <CardDescription>
              كل دعوة تنشئ رابطًا مباشرًا لصفحة إنشاء الحساب، مع صلاحية محددة وربط اختياري بفرع عند إنشاء مستخدم فرع.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inviteError ? (
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {inviteError}
              </p>
            ) : null}

            {invitationsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">جارٍ تحميل الدعوات...</p>
            ) : invitationsQuery.error ? (
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {invitationsQuery.error.message}
              </p>
            ) : invitations.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                لا توجد دعوات بعد.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الدور</TableHead>
                    <TableHead className="text-right">المدعو</TableHead>
                    <TableHead className="text-right">الفرع</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإنشاء</TableHead>
                    <TableHead className="text-right">الانتهاء</TableHead>
                    <TableHead className="text-right">الرابط</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>{ROLE_LABELS[invitation.role] ?? invitation.role}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{invitation.name || "بدون اسم"}</p>
                          <p className="text-xs text-muted-foreground">
                            {[invitation.email, invitation.phone].filter(Boolean).join(" • ") || "بدون بريد أو هاتف"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{invitation.branchName || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[invitation.status]}>
                          {statusLabels[invitation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(invitation.createdAt)}</TableCell>
                      <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
                      <TableCell>
                        {invitation.inviteUrl ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigator.clipboard?.writeText(resolveInviteUrl(invitation.inviteUrl))
                            }
                          >
                            <Copy className="size-4" />
                            نسخ الرابط
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">غير متوفر</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canManage && invitation.status === "pending" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeInvitation(invitation.id)}
                            disabled={revokingId === invitation.id}
                          >
                            <XCircle className="size-4" />
                            {revokingId === invitation.id ? "جارٍ الإلغاء..." : "إلغاء"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">لا يوجد</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء دعوة جديدة</DialogTitle>
            <DialogDescription>
              سينتج عن هذه العملية رابط دعوة صالح للاستخدام مرة واحدة لإنشاء الحساب.
            </DialogDescription>
          </DialogHeader>

          {!inviteResult ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-role">الدور</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      role: value as AppRole,
                      branchId: value === "branch_user" ? current.branchId : "",
                    }))
                  }
                >
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isBranchUserRole ? (
                <div className="grid gap-2">
                  <Label htmlFor="invite-branch">الفرع</Label>
                  <Select
                    value={form.branchId}
                    onValueChange={(value) => setForm((current) => ({ ...current, branchId: value }))}
                  >
                    <SelectTrigger id="invite-branch" className="w-full">
                      <SelectValue placeholder="اختر الفرع" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="invite-name">الاسم</Label>
                  <Input
                    id="invite-name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invite-phone">الهاتف</Label>
                  <Input
                    id="invite-phone"
                    dir="ltr"
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="invite-email">البريد الإلكتروني</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    dir="ltr"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invite-expiry">مدة الصلاحية بالأيام</Label>
                  <Input
                    id="invite-expiry"
                    type="number"
                    min={1}
                    max={30}
                    dir="ltr"
                    value={form.expiresInDays}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, expiresInDays: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invite-notes">ملاحظات</Label>
                <Input
                  id="invite-notes"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                تم إنشاء الدعوة بنجاح. يمكنك الآن نسخ الرابط وإرساله للمستخدم.
              </div>

              <div className="grid gap-2">
                <Label htmlFor="created-invite-url">رابط الدعوة</Label>
                <div className="flex gap-2">
                  <Input
                    id="created-invite-url"
                    readOnly
                    value={resolveInviteUrl(inviteResult.inviteUrl)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      navigator.clipboard?.writeText(resolveInviteUrl(inviteResult.inviteUrl))
                    }
                  >
                    <Copy className="size-4" />
                    نسخ
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <InfoTile label="الدور" value={ROLE_LABELS[inviteResult.role] ?? inviteResult.role} />
                <InfoTile label="الفرع" value={inviteResult.branchName || "غير مرتبط بفرع"} />
                <InfoTile label="تاريخ الانتهاء" value={formatDate(inviteResult.expiresAt)} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setInviteError(null);
              }}
            >
              إغلاق
            </Button>
            {!inviteResult ? (
              <Button
                type="button"
                onClick={handleCreateInvitation}
                disabled={mutation.isPending || allowedRoles.length === 0}
              >
                <ShieldCheck className="size-4" />
                {mutation.isPending ? "جارٍ الإنشاء..." : "إنشاء الدعوة"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TeamMemberCard({
  member,
  colorClass,
}: {
  member: TeamMember;
  colorClass: string;
}) {
  const initials = useMemo(
    () =>
      member.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join(""),
    [member.name]
  );

  return (
    <Card className="group overflow-hidden rounded-lg border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/accounting/team/${member.id}`}>
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
          <h2 className="text-lg font-semibold">{member.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] ?? member.role}
          </p>
          <div className="mt-4 flex max-w-full items-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-4 shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
        </CardContent>
      </Link>
      <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3 text-sm">
        <span className="text-muted-foreground">ملف العضو</span>
        <Button type="button" variant="ghost" size="sm" className="gap-2" asChild>
          <Link to={`/accounting/team/${member.id}`}>
            <Eye className="size-4" />
            عرض
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
