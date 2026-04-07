import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/providers/api-client";

type CustomerDetails = {
  customer: { id: number; name: string; phone: string; address?: string | null; notes?: string | null };
  cases: Array<{ id: number; caseCode: string; status: string; customerComplaint: string; deviceBrand?: string; deviceApplianceType?: string; deviceModelName?: string }>;
  invoices: Array<{ id: number; invoiceNumber: string; invoiceType: string; status: string; total: string; createdAt?: string | null }>;
};

export function CustomerDetailsPage() {
  const { id } = useParams();
  const [details, setDetails] = useState<CustomerDetails | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [error, setError] = useState<string | null>(null);

  const loadDetails = async () => {
    try {
      const data = await apiClient<CustomerDetails>(`/api/customers/${id}/details`);
      setDetails(data);
      setForm({
        name: data.customer.name,
        phone: data.customer.phone,
        address: data.customer.address || "",
        notes: data.customer.notes || "",
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر تحميل بيانات العميل");
    }
  };

  useEffect(() => { loadDetails(); }, [id]);

  const saveCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await apiClient(`/api/customers/${id}`, { method: "PATCH", body: form });
      await loadDetails();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر تحديث بيانات العميل");
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <Button variant="ghost" asChild><Link to="/accounting/customers"><ArrowRight /> العودة للعملاء</Link></Button>
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {details && (
        <>
          <h1 className="text-3xl font-semibold">{details.customer.name}</h1>
          <Card>
            <CardHeader><CardTitle>بيانات العميل</CardTitle></CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={saveCustomer}>
                <Field label="اسم العميل"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
                <Field label="رقم العميل / الهاتف"><Input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
                <Field label="الموقع / العنوان"><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
                <Field label="ملاحظات"><Input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
                <div className="md:col-span-2"><Button type="submit">حفظ التعديلات</Button></div>
              </form>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>حالات الصيانة</CardTitle></CardHeader><CardContent className="grid gap-3">{details.cases.length === 0 ? <p className="text-muted-foreground">لا توجد حالات.</p> : details.cases.map((item) => <Link key={item.id} to={`/cases/${item.id}`} className="rounded-lg border p-3"><p className="font-semibold">{item.caseCode}</p><p className="text-sm text-muted-foreground">{item.customerComplaint}</p></Link>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>الفواتير</CardTitle></CardHeader><CardContent className="grid gap-3">{details.invoices.length === 0 ? <p className="text-muted-foreground">لا توجد فواتير.</p> : details.invoices.map((item) => <div key={item.id} className="rounded-lg border p-3"><p className="font-semibold">{item.invoiceNumber}</p><p className="text-sm text-muted-foreground">{Number(item.total || 0).toLocaleString("ar-LY")} د.ل</p></div>)}</CardContent></Card>
        </>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}
