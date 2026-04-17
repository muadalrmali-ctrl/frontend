import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { apiClient } from "@/providers/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AccountingField, AccountingPageIntro, ErrorBanner } from "../shared";

const initialForm = () => ({
  date: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16),
  category: "",
  amount: "",
  paymentMethod: "cash",
  beneficiary: "",
  description: "",
  receiptImageUrl: "",
});

export function AccountingDailyExpenseCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const created = await apiClient<{ id: number }>("/api/accounting/daily-expenses", {
        method: "POST",
        body: {
          ...form,
          date: new Date(form.date).toISOString(),
          amount: Number(form.amount),
        },
      });
      navigate(`/accounting/daily-expenses/${created.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر إنشاء المصروف");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <AccountingPageIntro title="إضافة مصروف يومي" description="سجل مصروفًا جديدًا مع الفئة والمستفيد." backTo="/accounting/daily-expenses" backLabel="العودة إلى المصاريف" />
      <ErrorBanner message={error} />
      <Card>
        <CardHeader><CardTitle>بيانات المصروف</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={saveExpense}>
            <AccountingField label="التاريخ"><Input type="datetime-local" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required /></AccountingField>
            <AccountingField label="الفئة"><Input required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="نقل، شحن، وقود..." /></AccountingField>
            <AccountingField label="المبلغ"><Input type="number" min="0" step="0.001" required value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} /></AccountingField>
            <AccountingField label="طريقة الدفع">
              <Select value={form.paymentMethod} onValueChange={(value) => setForm((current) => ({ ...current, paymentMethod: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="transfer">تحويل</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </AccountingField>
            <AccountingField label="المستفيد"><Input required value={form.beneficiary} onChange={(event) => setForm((current) => ({ ...current, beneficiary: event.target.value }))} /></AccountingField>
            <AccountingField label="رابط صورة الإيصال"><Input value={form.receiptImageUrl} onChange={(event) => setForm((current) => ({ ...current, receiptImageUrl: event.target.value }))} placeholder="https://..." /></AccountingField>
            <div className="md:col-span-2"><AccountingField label="الوصف"><Textarea required value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="min-h-28" /></AccountingField></div>
            <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={isSaving}>{isSaving ? "جارٍ الحفظ..." : "حفظ المصروف"}</Button></div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
