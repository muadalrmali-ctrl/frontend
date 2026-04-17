import { useList } from "@refinedev/core";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { apiClient } from "@/providers/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AccountingField, AccountingPageIntro, ErrorBanner, formatMoney } from "../shared";

type TeamMember = { id: number; name: string };

const initialForm = () => ({
  date: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16),
  shiftType: "morning",
  collectedAmount: "",
  expensesAmount: "0",
  manualAdjustment: "0",
  handedToTreasuryAmount: "0",
  handoverStatus: "pending",
  employeeId: "none",
  notes: "",
});

export function AccountingDailyCashCreatePage() {
  const navigate = useNavigate();
  const { result } = useList<TeamMember>({ resource: "accounting-team" });
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const collected = Number(form.collectedAmount || 0);
  const expenses = Number(form.expensesAmount || 0);
  const adjustment = Number(form.manualAdjustment || 0);
  const handed = Number(form.handedToTreasuryAmount || 0);
  const net = collected - expenses + adjustment;
  const remaining = net - handed;

  const submitCash = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const created = await apiClient<{ id: number }>("/api/accounting/daily-cash", {
        method: "POST",
        body: {
          date: new Date(form.date).toISOString(),
          shiftType: form.shiftType,
          collectedAmount: collected,
          expensesAmount: expenses,
          manualAdjustment: adjustment,
          handedToTreasuryAmount: handed,
          handoverStatus: form.handoverStatus,
          employeeId: form.employeeId === "none" ? null : Number(form.employeeId),
          notes: form.notes,
        },
      });
      navigate(`/accounting/daily-cash/${created.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر إنشاء اليومية النقدية");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <AccountingPageIntro title="إضافة يومية نقدية" description="سجل مبالغ اليوم قبل تسليمها إلى الخزينة." backTo="/accounting/daily-cash" backLabel="العودة إلى اليومية النقدية" />
      <ErrorBanner message={error} />
      <Card>
        <CardHeader><CardTitle>البيانات اليومية</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitCash}>
            <AccountingField label="التاريخ"><Input type="datetime-local" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required /></AccountingField>
            <AccountingField label="الفترة"><Select value={form.shiftType} onValueChange={(value) => setForm((current) => ({ ...current, shiftType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="morning">صباحية</SelectItem><SelectItem value="evening">مسائية</SelectItem><SelectItem value="full_day">يوم كامل</SelectItem></SelectContent></Select></AccountingField>
            <AccountingField label="المبلغ المحصّل"><Input type="number" min="0" step="0.001" required value={form.collectedAmount} onChange={(event) => setForm((current) => ({ ...current, collectedAmount: event.target.value }))} /></AccountingField>
            <AccountingField label="المصاريف"><Input type="number" min="0" step="0.001" value={form.expensesAmount} onChange={(event) => setForm((current) => ({ ...current, expensesAmount: event.target.value }))} /></AccountingField>
            <AccountingField label="تعديل يدوي"><Input type="number" step="0.001" value={form.manualAdjustment} onChange={(event) => setForm((current) => ({ ...current, manualAdjustment: event.target.value }))} /></AccountingField>
            <AccountingField label="المسلّم للخزينة"><Input type="number" min="0" step="0.001" value={form.handedToTreasuryAmount} onChange={(event) => setForm((current) => ({ ...current, handedToTreasuryAmount: event.target.value }))} /></AccountingField>
            <AccountingField label="حالة التسليم"><Select value={form.handoverStatus} onValueChange={(value) => setForm((current) => ({ ...current, handoverStatus: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">معلّق</SelectItem><SelectItem value="partial">جزئي</SelectItem><SelectItem value="completed">مكتمل</SelectItem></SelectContent></Select></AccountingField>
            <AccountingField label="الموظف"><Select value={form.employeeId} onValueChange={(value) => setForm((current) => ({ ...current, employeeId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">بدون تحديد</SelectItem>{(result.data ?? []).map((member) => <SelectItem key={member.id} value={String(member.id)}>{member.name}</SelectItem>)}</SelectContent></Select></AccountingField>
            <div className="md:col-span-2 grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
              <Info label="الصافي" value={formatMoney(net)} />
              <Info label="المتبقي مع الموظف" value={formatMoney(remaining)} />
            </div>
            <div className="md:col-span-2"><AccountingField label="ملاحظات"><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-28" /></AccountingField></div>
            <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={isSaving}>{isSaving ? "جارٍ الحفظ..." : "حفظ اليومية"}</Button></div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
