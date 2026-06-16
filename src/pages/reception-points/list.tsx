import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { useCreate, useList, useNotification, useUpdate } from "@refinedev/core";
import { Link } from "react-router";
import { Edit2, MapPin, Plus, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { hasPermission } from "@/lib/access-control";
import { getStoredUser } from "@/providers/auth-provider";

type ReceptionPoint = {
  id: number;
  name: string;
  city: string;
  area?: string | null;
  address?: string | null;
  phone?: string | null;
  managerName?: string | null;
  status: "active" | "inactive";
  notes?: string | null;
  stats?: {
    totalCases: number;
    casesSentToMainCenter: number;
    casesInTransit: number;
    casesReceivedByMainCenter: number;
    localRepairCases: number;
    repairedCases: number;
    notRepairableCases: number;
  };
};

type PointForm = {
  id?: number;
  name: string;
  city: string;
  area: string;
  address: string;
  phone: string;
  managerName: string;
  notes: string;
};

const emptyForm: PointForm = {
  name: "",
  city: "",
  area: "",
  address: "",
  phone: "",
  managerName: "",
  notes: "",
};

export function ReceptionPointsPage() {
  const { open } = useNotification();
  const { result, query } = useList<ReceptionPoint>({ resource: "reception-points" });
  const { mutateAsync: createPoint, mutation: createMutation } = useCreate();
  const { mutateAsync: updatePoint, mutation: updateMutation } = useUpdate();
  const [form, setForm] = useState<PointForm>(emptyForm);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const canManage = hasPermission(getStoredUser(), "reception_points.manage");
  const points = result.data ?? [];

  const openForm = (point?: ReceptionPoint) => {
    setForm(point ? {
      id: point.id,
      name: point.name,
      city: point.city,
      area: point.area ?? "",
      address: point.address ?? "",
      phone: point.phone ?? "",
      managerName: point.managerName ?? "",
      notes: point.notes ?? "",
    } : emptyForm);
    setIsDialogOpen(true);
  };

  const savePoint = async (event: FormEvent) => {
    event.preventDefault();
    const values = {
      name: form.name.trim(),
      city: form.city.trim(),
      area: form.area.trim() || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      managerName: form.managerName.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (form.id) {
      await updatePoint({ resource: "reception-points", id: form.id, values });
    } else {
      await createPoint({ resource: "reception-points", values });
    }

    open?.({ type: "success", message: "تم حفظ نقطة الاستلام" });
    setIsDialogOpen(false);
    await query.refetch();
  };

  const toggleStatus = async (point: ReceptionPoint) => {
    await updatePoint({
      resource: "reception-points",
      id: point.id,
      values: { status: point.status === "active" ? "inactive" : "active" },
    });
    await query.refetch();
  };

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">نقاط الاستلام</h1>
          <p className="text-muted-foreground">إدارة نقاط الاستلام الخارجية وربط الحالات القادمة منها.</p>
        </div>
        {canManage ? <Button onClick={() => openForm()}><Plus /> إضافة نقطة استلام</Button> : null}
      </div>

      {query.error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{query.error.message}</p> : null}
      {query.isLoading ? <p className="text-muted-foreground">جار تحميل نقاط الاستلام...</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {points.map((point) => (
          <Card key={point.id} className="rounded-lg">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MapPin className="size-5 text-[#415CB3]" />
                  <Link to={`/accounting/reception-points/${point.id}`} className="hover:underline">{point.name}</Link>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{[point.city, point.area].filter(Boolean).join(" - ") || "غير محدد"}</p>
              </div>
              <Badge variant={point.status === "active" ? "default" : "secondary"}>{point.status === "active" ? "نشطة" : "معطلة"}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <Info label="الهاتف" value={point.phone || "غير متوفر"} />
                <Info label="المسؤول" value={point.managerName || "غير محدد"} />
                <Info label="العنوان" value={point.address || "غير محدد"} />
                <Info label="إجمالي الحالات" value={String(point.stats?.totalCases ?? 0)} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Metric label="إلى المركز" value={point.stats?.casesSentToMainCenter ?? 0} />
                <Metric label="قيد النقل" value={point.stats?.casesInTransit ?? 0} />
                <Metric label="صيانة محلية" value={point.stats?.localRepairCases ?? 0} />
              </div>
              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openForm(point)}><Edit2 /> تعديل</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => toggleStatus(point)} disabled={updateMutation.isPending}>
                    <Power /> {point.status === "active" ? "تعطيل" : "تفعيل"}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {!query.isLoading && points.length === 0 ? <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">لا توجد نقاط استلام بعد.</p> : null}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{form.id ? "تعديل نقطة استلام" : "إضافة نقطة استلام"}</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={savePoint}>
            <Field label="الاسم"><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></Field>
            <Field label="المدينة"><Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} required /></Field>
            <Field label="المنطقة"><Input value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} /></Field>
            <Field label="العنوان"><Input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></Field>
            <Field label="الهاتف"><Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></Field>
            <Field label="اسم المسؤول"><Input value={form.managerName} onChange={(event) => setForm((current) => ({ ...current, managerName: event.target.value }))} /></Field>
            <Field label="ملاحظات"><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <p><span className="font-bold text-foreground">{label}: </span><span className="text-muted-foreground">{value}</span></p>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border bg-muted/20 px-2 py-3"><p className="text-lg font-bold text-[#415CB3]">{value}</p><p className="text-muted-foreground">{label}</p></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}
