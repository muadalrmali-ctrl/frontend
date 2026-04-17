import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { apiClient } from "@/providers/api-client";
import { AccountingPageIntro, ErrorBanner, formatDateInput } from "../shared";
import { emptyPurchaseItem, PurchaseForm, type PurchaseFormState } from "./form";

type SupplierOption = { id: number; name: string };
type InventoryOption = { id: number; name: string; code: string; unitCost?: string | null };
type PurchaseDetails = {
  purchase: {
    id: number;
    supplierId: number;
    date: string;
    purchaseType: PurchaseFormState["purchaseType"];
    paymentMethod: PurchaseFormState["paymentMethod"];
    receivingStatus: PurchaseFormState["receivingStatus"];
    totalAmount: string;
    notes?: string | null;
  };
  items: Array<{
    itemName: string;
    itemType: "spare_part" | "consumable" | "tool" | "other";
    inventoryItemId?: number | null;
    quantity: number;
    unitCost: string;
    totalCost: string;
  }>;
};

export function AccountingPurchaseEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<PurchaseFormState>({
    date: "",
    supplierId: "",
    purchaseType: "spare_part",
    paymentMethod: "cash",
    receivingStatus: "pending",
    totalAmount: "0",
    notes: "",
    items: [emptyPurchaseItem()],
  });
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient<SupplierOption[]>("/api/accounting/suppliers"),
      apiClient<InventoryOption[]>("/api/inventory/items"),
      apiClient<PurchaseDetails>(`/api/accounting/purchases/${id}`),
    ])
      .then(([suppliersResult, inventoryResult, purchaseResult]) => {
        setSuppliers(suppliersResult);
        setInventoryItems(inventoryResult);
        setForm({
          date: formatDateInput(purchaseResult.purchase.date),
          supplierId: String(purchaseResult.purchase.supplierId),
          purchaseType: purchaseResult.purchase.purchaseType,
          paymentMethod: purchaseResult.purchase.paymentMethod,
          receivingStatus: purchaseResult.purchase.receivingStatus,
          totalAmount: purchaseResult.purchase.totalAmount,
          notes: purchaseResult.purchase.notes || "",
          items: purchaseResult.items.map((item) => ({
            itemName: item.itemName,
            itemType: item.itemType,
            inventoryItemId: item.inventoryItemId ? String(item.inventoryItemId) : "none",
            quantity: String(item.quantity),
            unitCost: String(item.unitCost),
            totalCost: String(item.totalCost),
          })),
        });
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "تعذر تحميل المشتريات"));
  }, [id]);

  const submitPurchase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await apiClient(`/api/accounting/purchases/${id}`, {
        method: "PATCH",
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
      navigate(`/accounting/purchases/${id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر تحديث المشتريات");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <AccountingPageIntro title="تعديل عملية شراء" description="حدّث بيانات عملية الشراء طالما لم يتم تأكيد إدخال المخزون." backTo={`/accounting/purchases/${id}`} backLabel="العودة إلى تفاصيل الشراء" />
      <ErrorBanner message={error} />
      <PurchaseForm form={form} suppliers={suppliers} inventoryItems={inventoryItems} isSaving={isSaving} submitLabel="حفظ التعديلات" onChange={setForm} onSubmit={submitPurchase} />
    </section>
  );
}
