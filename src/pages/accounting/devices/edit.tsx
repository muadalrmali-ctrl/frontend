import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { apiClient } from "@/providers/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AccountingField, AccountingPageIntro, ErrorBanner } from "../shared";

type Device = {
  id: number;
  applianceType: string;
  brand: string;
  modelName: string;
  modelCode?: string | null;
  notes?: string | null;
};

export function AccountingDeviceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ applianceType: "", brand: "", modelName: "", modelCode: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiClient<Device>(`/api/devices/${id}`)
      .then((device) =>
        setForm({
          applianceType: device.applianceType,
          brand: device.brand,
          modelName: device.modelName,
          modelCode: device.modelCode || "",
          notes: device.notes || "",
        })
      )
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "تعذر تحميل الجهاز"));
  }, [id]);

  const saveDevice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await apiClient(`/api/devices/${id}`, { method: "PATCH", body: form });
      navigate(`/accounting/devices/${id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تحديث الجهاز");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <AccountingPageIntro title="تعديل الجهاز" description="حدّث بيانات الجهاز أو الموديل الحالي." backTo={`/accounting/devices/${id}`} backLabel="العودة إلى تفاصيل الجهاز" />
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
            <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={isSaving}>{isSaving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button></div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
