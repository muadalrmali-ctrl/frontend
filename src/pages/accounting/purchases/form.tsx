import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AccountingField, formatMoney } from "../shared";

export type PurchaseFormItem = {
  itemName: string;
  itemType: "spare_part" | "consumable" | "tool" | "other";
  inventoryItemId: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
};

export type PurchaseFormState = {
  date: string;
  supplierId: string;
  purchaseType: "spare_part" | "consumable" | "tool" | "other";
  paymentMethod: "cash" | "credit" | "transfer";
  receivingStatus: "received" | "partial" | "pending";
  totalAmount: string;
  notes: string;
  items: PurchaseFormItem[];
};

type SupplierOption = { id: number; name: string };
type InventoryOption = { id: number; name: string; code: string; unitCost?: string | null };

export const emptyPurchaseItem = (): PurchaseFormItem => ({
  itemName: "",
  itemType: "spare_part",
  inventoryItemId: "none",
  quantity: "1",
  unitCost: "",
  totalCost: "",
});

export function PurchaseForm({
  form,
  suppliers,
  inventoryItems,
  isSaving,
  submitLabel,
  onChange,
  onSubmit,
}: {
  form: PurchaseFormState;
  suppliers: SupplierOption[];
  inventoryItems: InventoryOption[];
  isSaving: boolean;
  submitLabel: string;
  onChange: (next: PurchaseFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const updateItem = (index: number, next: Partial<PurchaseFormItem>) => {
    const items = [...form.items];
    const current = items[index];
    const updated = { ...current, ...next };
    const quantity = Number(updated.quantity || 0);
    const unitCost = Number(updated.unitCost || 0);
    updated.totalCost = quantity > 0 && unitCost >= 0 ? String(quantity * unitCost) : updated.totalCost;
    items[index] = updated;
    const totalAmount = items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
    onChange({ ...form, items, totalAmount: String(totalAmount) });
  };

  const addItem = () => onChange({ ...form, items: [...form.items, emptyPurchaseItem()] });
  const removeItem = (index: number) => {
    const items = form.items.filter((_, currentIndex) => currentIndex !== index);
    const totalAmount = items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
    onChange({ ...form, items: items.length ? items : [emptyPurchaseItem()], totalAmount: String(totalAmount) });
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader><CardTitle>بيانات الشراء</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <AccountingField label="تاريخ الشراء"><Input type="datetime-local" value={form.date} onChange={(event) => onChange({ ...form, date: event.target.value })} required /></AccountingField>
          <AccountingField label="المورد">
            <Select value={form.supplierId} onValueChange={(value) => onChange({ ...form, supplierId: value })}>
              <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
              <SelectContent>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.name}</SelectItem>)}</SelectContent>
            </Select>
          </AccountingField>
          <AccountingField label="نوع الشراء">
            <Select value={form.purchaseType} onValueChange={(value: PurchaseFormState["purchaseType"]) => onChange({ ...form, purchaseType: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spare_part">قطع غيار</SelectItem>
                <SelectItem value="consumable">مستهلكات</SelectItem>
                <SelectItem value="tool">أدوات</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </AccountingField>
          <AccountingField label="طريقة الدفع">
            <Select value={form.paymentMethod} onValueChange={(value: PurchaseFormState["paymentMethod"]) => onChange({ ...form, paymentMethod: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">نقدي</SelectItem>
                <SelectItem value="credit">آجل</SelectItem>
                <SelectItem value="transfer">تحويل</SelectItem>
              </SelectContent>
            </Select>
          </AccountingField>
          <AccountingField label="حالة الاستلام">
            <Select value={form.receivingStatus} onValueChange={(value: PurchaseFormState["receivingStatus"]) => onChange({ ...form, receivingStatus: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="received">تم الاستلام</SelectItem>
                <SelectItem value="partial">استلام جزئي</SelectItem>
                <SelectItem value="pending">معلّق</SelectItem>
              </SelectContent>
            </Select>
          </AccountingField>
          <AccountingField label="الإجمالي"><Input value={formatMoney(form.totalAmount)} readOnly /></AccountingField>
          <div className="md:col-span-2"><AccountingField label="ملاحظات"><Textarea value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} className="min-h-28" /></AccountingField></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>عناصر الشراء</CardTitle>
          <Button type="button" variant="outline" onClick={addItem}>إضافة عنصر</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.items.map((item, index) => (
            <div key={index} className="grid gap-4 rounded-lg border p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <AccountingField label="اسم العنصر"><Input value={item.itemName} onChange={(event) => updateItem(index, { itemName: event.target.value })} required /></AccountingField>
                <AccountingField label="نوع العنصر">
                  <Select value={item.itemType} onValueChange={(value: PurchaseFormItem["itemType"]) => updateItem(index, { itemType: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spare_part">قطع غيار</SelectItem>
                      <SelectItem value="consumable">مستهلكات</SelectItem>
                      <SelectItem value="tool">أدوات</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </AccountingField>
                <AccountingField label="ربط بالمخزون">
                  <Select
                    value={item.inventoryItemId}
                    onValueChange={(value) => {
                      const linked = inventoryItems.find((inventoryItem) => String(inventoryItem.id) === value);
                      updateItem(index, {
                        inventoryItemId: value,
                        itemName: linked ? linked.name : item.itemName,
                        unitCost: linked?.unitCost ? String(linked.unitCost) : item.unitCost,
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون ربط</SelectItem>
                      {inventoryItems.map((inventoryItem) => (
                        <SelectItem key={inventoryItem.id} value={String(inventoryItem.id)}>
                          {inventoryItem.name} - {inventoryItem.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </AccountingField>
                <AccountingField label="الكمية"><Input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} required /></AccountingField>
                <AccountingField label="تكلفة الوحدة"><Input type="number" min="0" step="0.001" value={item.unitCost} onChange={(event) => updateItem(index, { unitCost: event.target.value })} required /></AccountingField>
                <AccountingField label="الإجمالي"><Input value={item.totalCost} readOnly /></AccountingField>
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="ghost" onClick={() => removeItem(index)} disabled={form.items.length === 1}>حذف العنصر</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>{isSaving ? "جارٍ الحفظ..." : submitLabel}</Button>
      </div>
    </form>
  );
}

export function PageSection({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}
