import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { apiClient } from "@/providers/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AccountingField, AccountingPageIntro, ErrorBanner } from "../shared";

export function AccountingSupplierCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    contactPerson: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const created = await apiClient<{ id: number }>("/api/accounting/suppliers", { method: "POST", body: form });
      navigate(`/accounting/suppliers/${created.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر إنشاء المورد");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <AccountingPageIntro title="إضافة مورد" description="أنشئ موردًا جديدًا ليظهر مباشرة داخل المشتريات." backTo="/accounting/suppliers" backLabel="العودة إلى الموردين" />
      <ErrorBanner message={error} />
      <Card>
        <CardHeader>
          <CardTitle>بيانات المورد</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={saveSupplier}>
            <AccountingField label="اسم المورد"><Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></AccountingField>
            <AccountingField label="الهاتف"><Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></AccountingField>
            <AccountingField label="البريد الإلكتروني"><Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></AccountingField>
            <AccountingField label="جهة الاتصال"><Input value={form.contactPerson} onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))} /></AccountingField>
            <div className="md:col-span-2">
              <AccountingField label="العنوان"><Input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></AccountingField>
            </div>
            <div className="md:col-span-2">
              <AccountingField label="ملاحظات"><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-28" /></AccountingField>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={isSaving}>{isSaving ? "جارٍ الحفظ..." : "حفظ المورد"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
