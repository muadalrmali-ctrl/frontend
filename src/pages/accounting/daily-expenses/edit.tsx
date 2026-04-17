import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { apiClient } from "@/providers/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AccountingField, AccountingPageIntro, ErrorBanner, formatDateInput } from "../shared";

export function AccountingDailyExpenseEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ date: "", category: "", amount: "", paymentMethod: "cash", beneficiary: "", description: "", receiptImageUrl: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiClient<any>(`/api/accounting/daily-expenses/${id}`)
      .then((expense) =>
        setForm({
          date: formatDateInput(expense.date),
          category: expense.category,
          amount: String(expense.amount),
          paymentMethod: expense.paymentMethod,
          beneficiary: expense.beneficiary,
          description: expense.description,
          receiptImageUrl: expense.receiptImageUrl || "",
        })
      )
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "تعذر تحميل المصروف"));
  }, [id]);

  const saveExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await apiClient(`/api/accounting/daily-expenses/${id}`, {
        method: "PATCH",
        body: {
          ...form,
          date: new Date(form.date).toISOString(),
          amount: Number(form.amount),
        },
      });
      navigate(`/accounting/daily-expenses/${id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تحديث المصروف");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <AccountingPageIntro title="تعديل المصروف" description="حدّث تفاصيل المصروف اليومي الحالي." backTo={`/accounting/daily-expenses/${id}`} backLabel="العودة إلى تفاصيل المصروف" />
      <ErrorBanner message={error} />
      <Card><CardHeader><CardTitle>بيانات المصروف</CardTitle></CardHeader><CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={saveExpense}>
          <AccountingField label="التاريخ"><Input type="datetime-local" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required /></AccountingField>
          <AccountingField label="الفئة"><Input required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></AccountingField>
          <AccountingField label="المبلغ"><Input type="number" min="0" step="0.001" required value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} /></AccountingField>
          <AccountingField label="طريقة الدفع"><Select value={form.paymentMethod} onValueChange={(value) => setForm((current) => ({ ...current, paymentMethod: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">نقدي</SelectItem><SelectItem value="transfer">تحويل</SelectItem><SelectItem value="other">أخرى</SelectItem></SelectContent></Select></AccountingField>
          <AccountingField label="المستفيد"><Input required value={form.beneficiary} onChange={(event) => setForm((current) => ({ ...current, beneficiary: event.target.value }))} /></AccountingField>
          <AccountingField label="رابط الإيصال"><Input value={form.receiptImageUrl} onChange={(event) => setForm((current) => ({ ...current, receiptImageUrl: event.target.value }))} /></AccountingField>
          <div className="md:col-span-2"><AccountingField label="الوصف"><Textarea required value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="min-h-28" /></AccountingField></div>
          <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={isSaving}>{isSaving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button></div>
        </form>
      </CardContent></Card>
    </section>
  );
}
