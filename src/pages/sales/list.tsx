import { FormEvent, ReactNode, useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/providers/api-client";

type Invoice = {
  id: number;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  total: string;
  caseCode?: string | null;
  customerName?: string | null;
  directCustomerName?: string | null;
  deviceApplianceType?: string | null;
  deviceBrand?: string | null;
  createdAt?: string | null;
};

const formatMoney = (value?: string | null) => `${Number(value || 0).toLocaleString("ar-LY")} د.ل`;

export function SalesPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ customer: "", phone: "", item: "", quantity: "1", price: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const { result, query } = useList<Invoice>({ resource: "invoices" });
  const invoices = result.data ?? [];

  const filteredInvoices = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return invoices;
    return invoices.filter((invoice) =>
      [invoice.invoiceNumber, invoice.caseCode, invoice.customerName, invoice.directCustomerName, invoice.deviceBrand, invoice.deviceApplianceType]
        .filter(Boolean).join(" ").toLowerCase().includes(value)
    );
  }, [invoices, search]);

  const createInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await apiClient("/api/invoices", {
        method: "POST",
        body: {
          directCustomerName: form.customer,
          directCustomerPhone: form.phone,
          notes: form.notes,
          items: [{ name: form.item, quantity: Number(form.quantity || 1), unitPrice: Number(form.price || 0) }],
        },
      });
      setForm({ customer: "", phone: "", item: "", quantity: "1", price: "", notes: "" });
      setShowCreate(false);
      await query.refetch();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر إنشاء فاتورة البيع");
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">المبيعات</h1>
          <p className="text-muted-foreground">فواتير الصيانة وفواتير بيع قطع الغيار المباشر.</p>
        </div>
        <Button onClick={() => setShowCreate((value) => !value)}><Plus /> إنشاء فاتورة بيع مباشر</Button>
      </div>
      <Input placeholder="ابحث برقم الفاتورة أو العميل أو الحالة..." value={search} onChange={(event) => setSearch(event.target.value)} />
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {showCreate && (
        <Card>
          <CardHeader><CardTitle>فاتورة بيع مباشر</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={createInvoice}>
              <Field label="اسم العميل"><Input required value={form.customer} onChange={(event) => setForm({ ...form, customer: event.target.value })} /></Field>
              <Field label="الهاتف"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
              <Field label="اسم القطعة"><Input required value={form.item} onChange={(event) => setForm({ ...form, item: event.target.value })} /></Field>
              <Field label="الكمية"><Input type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></Field>
              <Field label="السعر"><Input required type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>
              <Field label="ملاحظات"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
              <div className="md:col-span-2"><Button type="submit">حفظ الفاتورة</Button></div>
            </form>
          </CardContent>
        </Card>
      )}
      {query.isLoading && <p className="text-muted-foreground">جاري تحميل الفواتير...</p>}
      {query.error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{query.error.message}</p>}
      {!query.isLoading && !query.error && (
        <div className="grid gap-3">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="grid gap-3 p-4 md:grid-cols-5">
                <Info label="رقم الفاتورة" value={invoice.invoiceNumber} />
                <Info label="النوع" value={invoice.invoiceType === "direct_sale" ? "بيع مباشر" : "صيانة"} />
                <Info label="العميل" value={invoice.customerName || invoice.directCustomerName || "غير محدد"} />
                <Info label="الحالة" value={invoice.caseCode || "بدون حالة"} />
                <Info label="الإجمالي" value={formatMoney(invoice.total)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>;
}
