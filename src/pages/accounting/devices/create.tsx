import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { apiClient } from "@/providers/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AccountingField, AccountingPageIntro, ErrorBanner } from "../shared";

export function AccountingDeviceCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ applianceType: "", brand: "", modelName: "", modelCode: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveDevice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const created = await apiClient<{ id: number }>("/api/devices", { method: "POST", body: form });
      navigate(`/accounting/devices/${created.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر إنشاء الجهاز");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <AccountingPageIntro title="إضافة جهاز" description="أضف جهازًا أو موديلًا جديدًا ليظهر في النظام." backTo="/accounting/devices" backLabel="العودة إلى الأجهزة" />
      <ErrorBanner message={error} />
      <Card>
        <CardHeader><CardTitle>بيانات الجهاز</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={saveDevice}>
            <AccountingField label="نوع الجهاز"><Input required value={form.applianceType} onChange={(event) => setForm((current) => ({ ...current, applianceType: event.target.value }))} /></AccountingField>
            <AccountingField label="الماركة"><Input required value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} /></AccountingField>
            <AccountingField label="اسم الموديل"><Input required value={form.modelName} onChange={(event) => setForm((current) => ({ ...current, modelName: event.target.value }))} /></AccountingField>
            <AccountingField label="كود الموديل"><Input value={form.modelCode} onChange={(event) => setForm((current) => ({ ...current, modelCode: event.target.value }))} /></AccountingField>
            <div className="md:col-span-2"><AccountingField label="ملاحظات"><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-28" /></AccountingField></div>
            <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={isSaving}>{isSaving ? "جارٍ الحفظ..." : "حفظ الجهاز"}</Button></div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
