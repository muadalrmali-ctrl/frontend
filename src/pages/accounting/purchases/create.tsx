import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { apiClient } from "@/providers/api-client";
import { AccountingPageIntro, ErrorBanner } from "../shared";
import { emptyPurchaseItem, PurchaseForm, type PurchaseFormState } from "./form";

type SupplierOption = { id: number; name: string };
type InventoryOption = { id: number; name: string; code: string; unitCost?: string | null };

const initialForm = (): PurchaseFormState => ({
  date: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16),
  supplierId: "",
  purchaseType: "spare_part",
  paymentMethod: "cash",
  receivingStatus: "pending",
  totalAmount: "0",
  notes: "",
  items: [emptyPurchaseItem()],
});

export function AccountingPurchaseCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<PurchaseFormState>(initialForm);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient<SupplierOption[]>("/api/accounting/suppliers"),
      apiClient<InventoryOption[]>("/api/inventory/items"),
    ])
      .then(([suppliersResult, inventoryResult]) => {
        setSuppliers(suppliersResult);
        setInventoryItems(inventoryResult);
        if (suppliersResult[0]) {
          setForm((current) => ({ ...current, supplierId: current.supplierId || String(suppliersResult[0].id) }));
        }
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "تعذر تحميل البيانات المرجعية"));
  }, []);

  const submitPurchase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const created = await apiClient<{ purchase: { id: number } }>("/api/accounting/purchases", {
        method: "POST",
        body: {
          date: new Date(form.date).toISOString(),
          supplierId: Number(form.supplierId),
          purchaseType: form.purchaseType,
          paymentMethod: form.paymentMethod,
          receivingStatus: form.receivingStatus,
          totalAmount: Number(form.totalAmount),
          notes: form.notes,
          items: form.items.map((item) => ({
            itemName: item.itemName,
            itemType: item.itemType,
            inventoryItemId: item.inventoryItemId === "none" ? null : Number(item.inventoryItemId),
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost),
            totalCost: Number(item.totalCost),
          })),
        },
      });
      navigate(`/accounting/purchases/${created.purchase.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر إنشاء المشتريات");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <AccountingPageIntro title="إنشاء عملية شراء" description="سجل عملية شراء جديدة واربط عناصرها بالمخزون عند الحاجة." backTo="/accounting/purchases" backLabel="العودة إلى المشتريات" />
      <ErrorBanner message={error} />
      <PurchaseForm form={form} suppliers={suppliers} inventoryItems={inventoryItems} isSaving={isSaving} submitLabel="حفظ عملية الشراء" onChange={setForm} onSubmit={submitPurchase} />
    </section>
  );
}
