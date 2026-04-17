import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { apiClient } from "@/providers/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AccountingField, AccountingPageIntro, ErrorBanner } from "../shared";

type SupplierDetails = {
  supplier: {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    contactPerson?: string | null;
    notes?: string | null;
  };
};

export function AccountingSupplierEditPage() {
  const { id } = useParams();
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

  useEffect(() => {
    apiClient<SupplierDetails>(`/api/accounting/suppliers/${id}`)
      .then((data) =>
        setForm({
          name: data.supplier.name,
          phone: data.supplier.phone || "",
          email: data.supplier.email || "",
          address: data.supplier.address || "",
          contactPerson: data.supplier.contactPerson || "",
          notes: data.supplier.notes || "",
        })
      )
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "تعذر تحميل المورد"));
  }, [id]);

  const saveSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await apiClient(`/api/accounting/suppliers/${id}`, { method: "PATCH", body: form });
      navigate(`/accounting/suppliers/${id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تحديث المورد");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <AccountingPageIntro title="تعديل المورد" description="حدّث بيانات المورد الحالية دون فقدان سجل مشترياته." backTo={`/accounting/suppliers/${id}`} backLabel="العودة إلى تفاصيل المورد" />
      <ErrorBanner message={error} />
      <Card>
        <CardHeader><CardTitle>بيانات المورد</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={saveSupplier}>
            <AccountingField label="اسم المورد"><Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></AccountingField>
            <AccountingField label="الهاتف"><Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></AccountingField>
            <AccountingField label="البريد الإلكتروني"><Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></AccountingField>
            <AccountingField label="جهة الاتصال"><Input value={form.contactPerson} onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))} /></AccountingField>
            <div className="md:col-span-2"><AccountingField label="العنوان"><Input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></AccountingField></div>
            <div className="md:col-span-2"><AccountingField label="ملاحظات"><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-28" /></AccountingField></div>
            <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={isSaving}>{isSaving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button></div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
