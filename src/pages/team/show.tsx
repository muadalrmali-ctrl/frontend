import { ReactNode, useEffect, useMemo, useState } from "react";
import { useList, useNotification, useOne } from "@refinedev/core";
import { ArrowRight, CheckCircle2, Clock3, Copy, Edit, KeyRound, Package, Phone, Save, ShieldCheck, Trash2, UserRound, Wrench } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ROLE_LABELS, hasPermission } from "@/lib/access-control";
import { apiClient } from "@/providers/api-client";
import { getStoredUser } from "@/providers/auth-provider";

type TeamMemberDetails = {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    phone?: string | null;
    status: string;
    receptionPointId?: number | null;
    joinDate?: string | null;
    specialty?: string | null;
    profilePhotoUrl?: string | null;
  };
  technicianSummary?: {
    totalCasesWorked: number;
    totalCompletedCases: number;
    totalCurrentCases: number;
    totalDelayedCases: number;
    averageRepairDurationHours?: number | null;
    completionRate?: number | null;
    delayRate?: number | null;
    lastActivityAt?: string | null;
    lastCaseWorkedOn?: {
      caseId: number;
      caseCode: string;
      customerName?: string | null;
      deviceLabel?: string | null;
    } | null;
  };
  storeManagerSummary?: {
    totalPartDeliveryActions: number;
    totalStockConfirmationActions: number;
    totalPendingConfirmations: number;
    lastActivityAt?: string | null;
  };
  currentCases?: Array<{
    id: number;
    caseCode: string;
    customerName?: string | null;
    deviceLabel?: string | null;
    status: string;
    priority: string;
    executionDueAt?: string | null;
  }>;
  completedCases?: Array<{
    id: number;
    caseCode: string;
    customerName?: string | null;
    deviceLabel?: string | null;
    completedAt?: string | null;
    finalResult?: string | null;
  }>;
  pendingConfirmations?: {
    directSales: Array<{
      id: number;
      saleCode?: string | null;
      invoiceNumber: string;
      customerName?: string | null;
      total: string;
      createdAt?: string | null;
    }>;
    pendingPartHandoffs: Array<{
      caseId: number;
      caseCode: string;
      customerName?: string | null;
      partName?: string | null;
      quantity: number;
      addedAt?: string | null;
    }>;
  };
  recentStockMovements?: Array<{
    id: number;
    movementType: string;
    quantity: number;
    itemName?: string | null;
    notes?: string | null;
    createdAt?: string | null;
  }>;
  activities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    caseId?: number | null;
    caseCode?: string | null;
    occurredAt?: string | null;
  }>;
};

type PermissionCatalogItem = {
  key: string;
  label: string;
  group: string;
  parentKey?: string | null;
  description?: string | null;
  sortOrder?: number;
};

type TeamMemberPermissions = {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    isAdmin: boolean;
  };
  permissions: string[];
};

type PasswordResetResponse = {
  emailSent: boolean;
  resetLink?: string;
  expiresAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
};

type ReceptionPoint = {
  id: number;
  name: string;
  city: string;
  status: string;
};

type TeamMemberEditForm = {
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  receptionPointId: string;
  notes: string;
};

const TEAM_ROLE_OPTIONS = [
  "admin",
  "receptionist",
  "technician",
  "store_manager",
  "technician_manager",
  "maintenance_manager",
  "reception_point_user",
] as const;

const PERMISSION_GROUP_LABELS: Record<string, string> = {
  dashboard: "لوحة التحكم",
  cases: "الحالات",
  maintenance_operations: "عمليات الصيانة",
  inventory: "المخزون",
  sales: "المبيعات",
  reports: "التقارير",
  accounting: "المحاسبة",
};

const formatDate = (value?: string | null) => {
  if (!value) return "غير متوفر";
  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatPercent = (value?: number | null) => (value == null ? "غير متوفر" : `${value}%`);

const formatMoney = (value?: string | null) =>
  `${Number(value || 0).toLocaleString("ar-LY", { maximumFractionDigits: 3 })} د.ل`;

const formatDuration = (hours?: number | null) => {
  if (hours == null) return "غير متوفر";
  if (hours < 24) return `${hours} ساعة`;
  const days = hours / 24;
  return `${days.toFixed(1)} يوم`;
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    received: "مستلمة",
    diagnosis: "تشخيص",
    waiting_approval: "بانتظار موافقة وتسجيل استلام قطعة غيار",
    in_progress: "قيد التنفيذ",
    repaired: "تم الإصلاح",
    completed: "مكتملة",
    not_repairable: "غير قابلة للإصلاح",
    delivered: "تم التسليم",
    archived: "مؤرشفة",
  };
  return labels[status] || status;
};

export function TeamMemberDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { open } = useNotification();
  const currentUser = getStoredUser();
  const canManagePermissions = currentUser?.role === "admin";
  const canResetPassword = hasPermission(currentUser, "reset_user_password");
  const canEditTeamMember = hasPermission(currentUser, "edit_team_member");
  const canDeleteTeamMember = hasPermission(currentUser, "delete_team_member");
  const memberId = Number(id);
  const { result, query } = useOne<TeamMemberDetails>({
    resource: "accounting-team",
    id: memberId,
    queryOptions: {
      enabled: Number.isFinite(memberId),
    },
  });
  const receptionPointsQuery = useList<ReceptionPoint>({
    resource: "reception-points",
    queryOptions: {
      enabled: canEditTeamMember,
    },
  });
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [assignedPermissions, setAssignedPermissions] = useState<string[]>([]);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [permissionPayload, setPermissionPayload] = useState<TeamMemberPermissions | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetLinkDialogOpen, setIsResetLinkDialogOpen] = useState(false);
  const [isCreatingResetLink, setIsCreatingResetLink] = useState(false);
  const [passwordResetResult, setPasswordResetResult] = useState<PasswordResetResponse | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [editForm, setEditForm] = useState<TeamMemberEditForm>({
    name: "",
    email: "",
    phone: "",
    role: "technician",
    status: "active",
    receptionPointId: "none",
    notes: "",
  });

  useEffect(() => {
    if (!result?.user) return;
    setEditForm({
      name: result.user.name || "",
      email: result.user.email || "",
      phone: result.user.phone || "",
      role: result.user.role || "technician",
      status: result.user.status || "active",
      receptionPointId: result.user.receptionPointId ? String(result.user.receptionPointId) : "none",
      notes: "",
    });
  }, [result]);

  useEffect(() => {
    if (!canManagePermissions || !Number.isFinite(memberId)) {
      return;
    }

    let isMounted = true;
    setIsPermissionsLoading(true);
    setPermissionsError(null);

    Promise.all([
      apiClient<PermissionCatalogItem[]>("/api/permissions/catalog"),
      apiClient<TeamMemberPermissions>(`/api/auth/team/${memberId}/permissions`),
    ])
      .then(([catalogResponse, permissionsResponse]) => {
        if (!isMounted) return;
        setCatalog(catalogResponse);
        setPermissionPayload(permissionsResponse);
        setAssignedPermissions(normalizePermissionSelection(permissionsResponse.permissions, catalogResponse));
      })
      .catch((error) => {
        if (!isMounted) return;
        setPermissionsError(error instanceof Error ? error.message : "تعذر تحميل الصلاحيات");
      })
      .finally(() => {
        if (isMounted) {
          setIsPermissionsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [canManagePermissions, memberId]);

  if (!Number.isFinite(memberId)) {
    return <p className="text-sm text-destructive">رقم العضو غير صالح.</p>;
  }

  const details = result;
  const role = details?.user.role;
  const isTechnician = role === "technician" || role === "technician_manager";
  const isStoreManager = role === "store_manager";
  const isSimpleRole = role === "receptionist" || role === "admin" || role === "maintenance_manager";
  const permissionTree = useMemo(() => buildPermissionTree(catalog), [catalog]);
  const activePermissionsCount = assignedPermissions.length;

  const togglePermission = (permissionKey: string, checked: boolean) => {
    setAssignedPermissions((current) =>
      computeNextPermissionSelection({
        currentKeys: current,
        permissionKey,
        checked,
        catalog,
      })
    );
  };

  const selectAllPermissions = () => {
    setAssignedPermissions(catalog.map((item) => item.key));
  };

  const clearAllPermissions = () => {
    setAssignedPermissions([]);
  };

  const savePermissions = async () => {
    if (!permissionPayload || permissionPayload.user.isAdmin) {
      return;
    }

    setIsSavingPermissions(true);
    setPermissionsError(null);

    try {
      const normalizedSelection = normalizePermissionSelection(assignedPermissions, catalog);
      await apiClient(`/api/auth/team/${memberId}/permissions`, {
        method: "PUT",
        body: {
          permissions: normalizedSelection,
        },
      });
      setAssignedPermissions(normalizedSelection);
      setPermissionPayload((current) =>
        current
          ? {
              ...current,
              permissions: normalizedSelection,
            }
          : current
      );
      open?.({
        type: "success",
        message: "تم حفظ الصلاحيات",
        description: "تم تحديث صلاحيات العضو بنجاح.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ الصلاحيات";
      setPermissionsError(message);
      open?.({
        type: "error",
        message: "تعذر حفظ الصلاحيات",
        description: message,
      });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const createPasswordResetLink = async () => {
    setIsCreatingResetLink(true);

    try {
      const result = await apiClient<PasswordResetResponse>(`/api/auth/team/${memberId}/password-reset`, {
        method: "POST",
      });
      setPasswordResetResult(result);
      setIsResetDialogOpen(false);

      if (result.emailSent) {
        open?.({
          type: "success",
          message: "تم إرسال رابط إعادة التعيين",
          description: `تم إرسال الرابط إلى ${result.user.email}.`,
        });
      } else {
        setIsResetLinkDialogOpen(true);
        open?.({
          type: "success",
          message: "تم إنشاء رابط إعادة التعيين",
          description: "لم يتم إعداد إرسال البريد، يمكنك نسخ الرابط وإرساله يدويًا.",
        });
      }
    } catch (error) {
      open?.({
        type: "error",
        message: "تعذر إنشاء رابط إعادة التعيين",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsCreatingResetLink(false);
    }
  };

  const copyResetLink = async () => {
    if (!passwordResetResult?.resetLink) return;
    await navigator.clipboard?.writeText(passwordResetResult.resetLink);
    open?.({
      type: "success",
      message: "تم نسخ رابط إعادة التعيين",
    });
  };

  const saveTeamMember = async () => {
    setIsSavingMember(true);

    try {
      await apiClient(`/api/auth/team/${memberId}`, {
        method: "PATCH",
        body: {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone || null,
          role: editForm.role,
          status: editForm.status,
          receptionPointId: editForm.receptionPointId === "none" ? null : Number(editForm.receptionPointId),
        },
      });
      await query.refetch();
      setIsEditDialogOpen(false);
      open?.({
        type: "success",
        message: "تم تعديل البيانات",
        description: "تم تحديث بيانات عضو الفريق بنجاح.",
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "تعذر تعديل البيانات",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
      });
    } finally {
      setIsSavingMember(false);
    }
  };

  const deleteTeamMember = async () => {
    setIsDeletingMember(true);

    try {
      await apiClient(`/api/auth/team/${memberId}`, {
        method: "DELETE",
      });
      open?.({
        type: "success",
        message: "تم حذف العضو",
        description: "تم تعطيل حساب العضو مع الحفاظ على السجلات التاريخية.",
      });
      navigate("/accounting/team");
    } catch (error) {
      open?.({
        type: "error",
        message: "تعذر حذف العضو",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
      });
    } finally {
      setIsDeletingMember(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <Button type="button" variant="ghost" onClick={() => navigate("/accounting/team")}>
            <ArrowRight className="size-4" />
            العودة إلى الفريق
          </Button>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={details?.user.name} imageUrl={details?.user.profilePhotoUrl || null} />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold">{details?.user.name || "تفاصيل عضو الفريق"}</h1>
                {details?.user.role ? <Badge variant="outline">{ROLE_LABELS[details.user.role as keyof typeof ROLE_LABELS] || details.user.role}</Badge> : null}
                {details?.user.status ? <Badge variant="outline">{details.user.status}</Badge> : null}
              </div>
              <p className="text-muted-foreground">
                صفحة تفصيلية لعرض بيانات عضو الفريق والأقسام المرتبطة بدوره داخل مركز الصيانة.
              </p>
              {details && canResetPassword ? (
                <Button type="button" variant="outline" className="w-fit" onClick={() => setIsResetDialogOpen(true)}>
                  <KeyRound className="size-4" />
                  إرسال رابط إعادة تعيين كلمة المرور
                </Button>
              ) : null}
              {details ? (
                <div className="flex flex-wrap gap-2">
                  {canEditTeamMember ? (
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                      <Edit className="size-4" />
                      تعديل البيانات
                    </Button>
                  ) : null}
                  {canDeleteTeamMember && currentUser?.id !== memberId ? (
                    <Button type="button" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                      <Trash2 className="size-4" />
                      حذف العضو
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إعادة تعيين كلمة المرور؟</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد إنشاء رابط إعادة تعيين كلمة المرور لهذا المستخدم؟ سيكون الرابط صالحًا لمدة ساعة واحدة ولا يمكن استخدامه إلا مرة واحدة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreatingResetLink}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={createPasswordResetLink} disabled={isCreatingResetLink}>
              {isCreatingResetLink ? "جارٍ الإنشاء..." : "إنشاء الرابط"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isResetLinkDialogOpen} onOpenChange={setIsResetLinkDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>رابط إعادة التعيين</DialogTitle>
            <DialogDescription>
              لم يتم العثور على خدمة بريد مفعلة، انسخ الرابط وأرسله للمستخدم يدويًا. لا ترسل كلمة مرور مباشرة.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="text-sm font-medium">رابط إعادة التعيين</label>
            <Input dir="ltr" readOnly value={passwordResetResult?.resetLink ?? ""} />
            <p className="text-xs text-muted-foreground">
              ينتهي الرابط في: {formatDate(passwordResetResult?.expiresAt)}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsResetLinkDialogOpen(false)}>إغلاق</Button>
            <Button type="button" onClick={copyResetLink} disabled={!passwordResetResult?.resetLink}>
              <Copy className="size-4" />
              نسخ الرابط
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات العضو</DialogTitle>
            <DialogDescription>
              حدّث بيانات عضو الفريق دون تعديل كلمة المرور من هذه الصفحة.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="الاسم">
              <Input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="البريد الإلكتروني">
              <Input dir="ltr" type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label="الهاتف">
              <Input dir="ltr" value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="الدور">
              <Select value={editForm.role} onValueChange={(value) => setEditForm((current) => ({ ...current, role: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLE_OPTIONS.map((roleOption) => (
                    <SelectItem key={roleOption} value={roleOption}>
                      {ROLE_LABELS[roleOption] ?? roleOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="الحالة">
              <Select value={editForm.status} onValueChange={(value) => setEditForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="نقطة الاستلام">
              <Select value={editForm.receptionPointId} onValueChange={(value) => setEditForm((current) => ({ ...current, receptionPointId: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="بدون نقطة استلام" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون نقطة استلام</SelectItem>
                  {(receptionPointsQuery.result.data ?? []).map((point) => (
                    <SelectItem key={point.id} value={String(point.id)}>
                      {point.name} - {point.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="md:col-span-2">
              <Field label="ملاحظات">
                <Textarea value={editForm.notes} onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} placeholder="غير محفوظة حالياً في بيانات العضو" />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSavingMember}>
              إلغاء
            </Button>
            <Button type="button" onClick={saveTeamMember} disabled={isSavingMember}>
              {isSavingMember ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العضو</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا العضو؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMember}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTeamMember} disabled={isDeletingMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingMember ? "جارٍ الحذف..." : "تأكيد الحذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {query.isLoading ? <p className="text-muted-foreground">جارٍ تحميل بيانات عضو الفريق...</p> : null}
      {query.error ? <p className="text-sm text-destructive">{query.error.message}</p> : null}

      {details ? (
        <>
          <Card className="rounded-2xl border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>البيانات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label="الاسم الكامل" value={details.user.name} />
              <Info label="الدور" value={ROLE_LABELS[details.user.role as keyof typeof ROLE_LABELS] || details.user.role} />
              <Info label="الهاتف" value={details.user.phone || "غير متوفر"} icon={<Phone className="size-4" />} />
              <Info label="البريد الإلكتروني" value={details.user.email} />
              <Info label="الحالة" value={details.user.status} />
              <Info label="تاريخ الانضمام" value={formatDate(details.user.joinDate)} />
              {isTechnician ? <Info label="التخصص" value={details.user.specialty || "غير متوفر"} icon={<Wrench className="size-4" />} /> : null}
            </CardContent>
          </Card>

          {canManagePermissions ? (
            <Card className="rounded-2xl border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle>إدارة صلاحيات العضو</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="permissions" className="gap-4">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="permissions">الصلاحيات</TabsTrigger>
                  </TabsList>
                  <TabsContent value="permissions" className="space-y-4">
                    {isPermissionsLoading ? <p className="text-sm text-muted-foreground">جارٍ تحميل الصلاحيات...</p> : null}
                    {permissionsError ? <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{permissionsError}</p> : null}
                    {permissionPayload?.user.isAdmin ? (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm text-muted-foreground">
                        هذا العضو يحمل دور الأدمن، وبالتالي يملك وصولًا كاملاً ثابتًا ولا يتم تقييده من شاشة الصلاحيات.
                      </div>
                    ) : null}
                    {!isPermissionsLoading && permissionTree.length > 0 && !permissionPayload?.user.isAdmin ? (
                      <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-sm text-muted-foreground">
                            عدد الصلاحيات المفعلة: <span className="font-semibold text-foreground">{activePermissionsCount}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={selectAllPermissions}>
                              تحديد الكل
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={clearAllPermissions}>
                              إلغاء الكل
                            </Button>
                            <Button type="button" size="sm" onClick={savePermissions} disabled={isSavingPermissions}>
                              <Save className="size-4" />
                              {isSavingPermissions ? "جارٍ الحفظ..." : "حفظ"}
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                          {permissionTree.map((group) => (
                            <Card key={group.groupKey} className="rounded-2xl border-border/60 bg-muted/10">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base">{group.label}</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {group.items.map((item) => (
                                  <PermissionNode
                                    key={item.key}
                                    item={item}
                                    catalog={catalog}
                                    selectedKeys={assignedPermissions}
                                    onToggle={togglePermission}
                                  />
                                ))}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : null}

          {isTechnician && details.technicianSummary ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="إجمالي الحالات منذ الانضمام" value={String(details.technicianSummary.totalCasesWorked)} icon={<UserRound className="size-4" />} />
                <MetricCard label="الحالات المكتملة" value={String(details.technicianSummary.totalCompletedCases)} icon={<CheckCircle2 className="size-4" />} />
                <MetricCard label="الحالات الحالية" value={String(details.technicianSummary.totalCurrentCases)} icon={<Clock3 className="size-4" />} />
                <MetricCard label="الحالات المتأخرة" value={String(details.technicianSummary.totalDelayedCases)} icon={<Clock3 className="size-4" />} />
                <MetricCard label="متوسط مدة الإصلاح" value={formatDuration(details.technicianSummary.averageRepairDurationHours)} icon={<Wrench className="size-4" />} />
                <MetricCard label="آخر نشاط" value={formatDate(details.technicianSummary.lastActivityAt)} icon={<Clock3 className="size-4" />} />
                <MetricCard
                  label="آخر حالة"
                  value={details.technicianSummary.lastCaseWorkedOn?.caseCode || "غير متوفر"}
                  hint={details.technicianSummary.lastCaseWorkedOn?.deviceLabel || details.technicianSummary.lastCaseWorkedOn?.customerName || undefined}
                  icon={<Package className="size-4" />}
                />
              </div>

              <Card className="rounded-2xl border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle>الجودة والانضباط</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Info label="نسبة الإكمال" value={formatPercent(details.technicianSummary.completionRate)} />
                  <Info label="مؤشر التأخير" value={formatPercent(details.technicianSummary.delayRate)} />
                  <Info label="الحالات المعادة / المفتوحة مجددًا" value="غير متوفر" />
                  <Info label="التقييم العام" value="غير متوفر" />
                </CardContent>
              </Card>

              <Tabs defaultValue="current" className="gap-4">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="current">الحالات الحالية</TabsTrigger>
                  <TabsTrigger value="completed">الحالات المكتملة</TabsTrigger>
                </TabsList>

                <TabsContent value="current">
                  <CasesTable
                    emptyMessage="لا توجد حالات حالية مرتبطة بهذا الفني."
                    headers={["كود الحالة", "العميل", "الجهاز", "الحالة", "الأولوية", "الوقت المتوقع"]}
                    rows={(details.currentCases || []).map((entry) => [
                      <Link key={`${entry.id}-code`} to={`/cases/${entry.id}`} className="font-medium hover:underline">{entry.caseCode}</Link>,
                      entry.customerName || "غير محدد",
                      entry.deviceLabel || "غير محدد",
                      getStatusLabel(entry.status),
                      entry.priority || "غير محدد",
                      formatDate(entry.executionDueAt),
                    ])}
                  />
                </TabsContent>

                <TabsContent value="completed">
                  <CasesTable
                    emptyMessage="لا توجد حالات مكتملة لهذا الفني بعد."
                    headers={["كود الحالة", "العميل", "الجهاز", "تاريخ الإكمال", "النتيجة النهائية"]}
                    rows={(details.completedCases || []).map((entry) => [
                      <Link key={`${entry.id}-code`} to={`/cases/${entry.id}`} className="font-medium hover:underline">{entry.caseCode}</Link>,
                      entry.customerName || "غير محدد",
                      entry.deviceLabel || "غير محدد",
                      formatDate(entry.completedAt),
                      entry.finalResult || "غير محدد",
                    ])}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : null}

          {isStoreManager && details.storeManagerSummary ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="إجمالي عمليات تسليم القطع" value={String(details.storeManagerSummary.totalPartDeliveryActions)} icon={<Package className="size-4" />} />
                <MetricCard label="إجمالي تأكيدات المخزون" value={String(details.storeManagerSummary.totalStockConfirmationActions)} icon={<ShieldCheck className="size-4" />} />
                <MetricCard label="إجمالي المعاملات المعلقة" value={String(details.storeManagerSummary.totalPendingConfirmations)} icon={<Clock3 className="size-4" />} />
                <MetricCard label="آخر نشاط" value={formatDate(details.storeManagerSummary.lastActivityAt)} icon={<Clock3 className="size-4" />} />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="rounded-2xl border-border/70 bg-card/80">
                  <CardHeader>
                    <CardTitle>التأكيدات المعلقة</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="space-y-3">
                      <h3 className="font-medium">البيع المباشر بانتظار التأكيد</h3>
                      {details.pendingConfirmations?.directSales.length ? details.pendingConfirmations.directSales.map((entry) => (
                        <div key={entry.id} className="rounded-xl border bg-muted/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <Link to={`/sales/${entry.id}`} className="font-medium hover:underline">
                              {entry.saleCode || entry.invoiceNumber}
                            </Link>
                            <Badge variant="outline">{formatMoney(entry.total)}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{entry.customerName || "غير محدد"} • {formatDate(entry.createdAt)}</p>
                        </div>
                      )) : <EmptyState message="لا توجد مبيعات مباشرة معلقة." />}
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-medium">قطع بانتظار إجراء التسليم</h3>
                      {details.pendingConfirmations?.pendingPartHandoffs.length ? details.pendingConfirmations.pendingPartHandoffs.map((entry, index) => (
                        <div key={`${entry.caseId}-${entry.partName || index}`} className="rounded-xl border bg-muted/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <Link to={`/cases/${entry.caseId}`} className="font-medium hover:underline">
                              {entry.caseCode}
                            </Link>
                            <Badge variant="outline">الكمية: {entry.quantity}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{entry.customerName || "بدون عميل"} • {entry.partName || "قطعة غير محددة"} • {formatDate(entry.addedAt)}</p>
                        </div>
                      )) : <EmptyState message="لا توجد طلبات تسليم قطع معلقة." />}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/70 bg-card/80">
                  <CardHeader>
                    <CardTitle>أحدث حركات المخزون</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {details.recentStockMovements?.length ? details.recentStockMovements.map((entry) => (
                      <div key={entry.id} className="rounded-xl border bg-muted/10 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{movementLabel(entry.movementType)}</p>
                          <Badge variant="outline">{entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{[entry.itemName, entry.notes, formatDate(entry.createdAt)].filter(Boolean).join(" • ")}</p>
                      </div>
                    )) : <EmptyState message="لا توجد حركات مخزون حديثة." />}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}

          {isSimpleRole ? (
            <Card className="rounded-2xl border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle>ملخص الدور</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  تم الاكتفاء بعرض البيانات الأساسية لهذا الدور كما طُلب، بدون إضافة لوحات مؤشرات أو تحليلات إضافية.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-2xl border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>سجل النشاط</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {details.activities.length ? details.activities.map((entry) => (
                <div key={entry.id} className="rounded-xl border bg-muted/10 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{entry.title}</p>
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.caseId ? (
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link to={`/cases/${entry.caseId}`}>{entry.caseCode || "فتح الحالة"}</Link>
                        </Button>
                      ) : null}
                      <span className="text-xs text-muted-foreground">{formatDate(entry.occurredAt)}</span>
                    </div>
                  </div>
                </div>
              )) : <EmptyState message="لا توجد أنشطة حديثة لهذا العضو." />}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}

function PermissionNode({
  item,
  catalog,
  selectedKeys,
  onToggle,
  level = 0,
}: {
  item: PermissionCatalogItem;
  catalog: PermissionCatalogItem[];
  selectedKeys: string[];
  onToggle: (permissionKey: string, checked: boolean) => void;
  level?: number;
}) {
  const directChildren = catalog
    .filter((entry) => entry.parentKey === item.key)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const state = getPermissionCheckboxState(item.key, selectedKeys, catalog);

  return (
    <div className="space-y-3">
      <label
        className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/70 px-4 py-3"
        style={{ marginInlineStart: `${level * 18}px` }}
      >
        <Checkbox
          checked={state}
          onCheckedChange={(checked) => onToggle(item.key, checked === true)}
          className="mt-1"
        />
        <div className="grid gap-1">
          <span className="font-medium">{item.label}</span>
          {item.description ? <span className="text-xs text-muted-foreground">{item.description}</span> : null}
          <span className="text-[11px] text-muted-foreground">{item.key}</span>
        </div>
      </label>
      {directChildren.map((child) => (
        <PermissionNode
          key={child.key}
          item={child}
          catalog={catalog}
          selectedKeys={selectedKeys}
          onToggle={onToggle}
          level={level + 1}
        />
      ))}
    </div>
  );
}

function buildPermissionTree(catalog: PermissionCatalogItem[]) {
  const grouped = new Map<string, PermissionCatalogItem[]>();
  const catalogKeys = new Set(catalog.map((item) => item.key));

  for (const item of catalog) {
    const hasValidParent = item.parentKey && catalogKeys.has(item.parentKey);
    if (hasValidParent) {
      continue;
    }

    const groupItems = grouped.get(item.group) ?? [];
    groupItems.push(item);
    grouped.set(item.group, groupItems);
  }

  return Array.from(grouped.entries()).map(([groupKey, items]) => ({
    groupKey,
    label: PERMISSION_GROUP_LABELS[groupKey] ?? groupKey,
    items: [...items].sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0)),
  }));
}

function getDescendantKeys(permissionKey: string, catalog: PermissionCatalogItem[]): string[] {
  const directChildren = catalog.filter((item) => item.parentKey === permissionKey);
  return directChildren.flatMap((child) => [child.key, ...getDescendantKeys(child.key, catalog)]);
}

function getAncestorKeys(permissionKey: string, catalog: PermissionCatalogItem[]) {
  const ancestors: string[] = [];
  const catalogMap = new Map(catalog.map((item) => [item.key, item]));
  let current = catalogMap.get(permissionKey);

  while (current?.parentKey) {
    ancestors.push(current.parentKey);
    current = catalogMap.get(current.parentKey);
  }

  return ancestors;
}

function normalizePermissionSelection(permissionKeys: string[], catalog: PermissionCatalogItem[]) {
  const normalized = new Set(permissionKeys);

  for (const key of permissionKeys) {
    getAncestorKeys(key, catalog).forEach((ancestorKey) => normalized.add(ancestorKey));
  }

  return [...normalized];
}

function computeNextPermissionSelection({
  currentKeys,
  permissionKey,
  checked,
  catalog,
}: {
  currentKeys: string[];
  permissionKey: string;
  checked: boolean;
  catalog: PermissionCatalogItem[];
}) {
  const nextKeys = new Set(currentKeys);
  const relatedKeys = [permissionKey, ...getDescendantKeys(permissionKey, catalog)];

  if (checked) {
    relatedKeys.forEach((key) => nextKeys.add(key));
    getAncestorKeys(permissionKey, catalog).forEach((key) => nextKeys.add(key));
  } else {
    relatedKeys.forEach((key) => nextKeys.delete(key));
  }

  return normalizePermissionSelection([...nextKeys], catalog);
}

function getPermissionCheckboxState(permissionKey: string, selectedKeys: string[], catalog: PermissionCatalogItem[]) {
  const selectedSet = new Set(selectedKeys);
  const descendantKeys = getDescendantKeys(permissionKey, catalog);

  if (!descendantKeys.length) {
    return selectedSet.has(permissionKey);
  }

  const selectedChildrenCount = descendantKeys.filter((key) => selectedSet.has(key)).length;
  if (selectedChildrenCount === 0) {
    return selectedSet.has(permissionKey);
  }

  if (selectedChildrenCount === descendantKeys.length) {
    return true;
  }

  return "indeterminate" as const;
}

function Avatar({ name, imageUrl }: { name?: string; imageUrl?: string | null }) {
  const initials = name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border bg-muted/30 text-xl font-semibold">
      {imageUrl ? <img src={imageUrl} alt={name || "عضو الفريق"} className="h-full w-full object-cover" /> : initials || <UserRound className="size-8" />}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CasesTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage: string;
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card/80">
      <CardContent className="p-0">
        {rows.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header} className="text-right">{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={index}>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={cellIndex}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState message={emptyMessage} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="rounded-xl border bg-muted/10 p-4 text-sm text-muted-foreground">{message}</p>;
}

function movementLabel(type: string) {
  switch (type) {
    case "delivered_to_case":
      return "تسليم قطعة إلى حالة";
    case "sold_direct":
      return "تأكيد بيع مباشر";
    case "adjustment":
      return "تحديث كمية";
    case "item_updated":
      return "تحديث بيانات قطعة";
    case "item_archived":
      return "أرشفة قطعة";
    default:
      return type;
  }
}
