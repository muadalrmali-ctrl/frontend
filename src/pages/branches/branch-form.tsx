import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { useCreate, useUpdate } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AccountingField, AccountingPageIntro, ErrorBanner } from "../accounting/shared";

type BranchValues = {
  name: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  status: "active" | "inactive";
  notes: string;
};

const DEFAULT_VALUES: BranchValues = {
  name: "",
  code: "",
  city: "",
  address: "",
  phone: "",
  status: "active",
  notes: "",
};

export function BranchFormPage({
  title,
  description,
  initialValues = DEFAULT_VALUES,
  branchId,
}: {
  title: string;
  description: string;
  initialValues?: BranchValues;
  branchId?: number;
}) {
  const navigate = useNavigate();
  const [values, setValues] = useState<BranchValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: createBranch, mutation: createMutation } = useCreate();
  const { mutateAsync: updateBranch, mutation: updateMutation } = useUpdate();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const setField = <TKey extends keyof BranchValues>(key: TKey, value: BranchValues[TKey]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const payload = {
      name: values.name.trim(),
      code: values.code.trim(),
      city: values.city.trim(),
      address: values.address.trim() || null,
      phone: values.phone.trim() || null,
      status: values.status,
      notes: values.notes.trim() || null,
    };

    try {
      if (branchId) {
        await updateBranch({
          resource: "accounting-branches",
          id: branchId,
          values: payload,
        });
      } else {
        await createBranch({
          resource: "accounting-branches",
          values: payload,
        });
      }

      navigate("/accounting/branches");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "تعذر حفظ الفرع");
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <AccountingPageIntro
        title={title}
        description={description}
        backTo="/accounting/branches"
        backLabel="العودة إلى الفروع"
      />

      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>بيانات الفرع</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <AccountingField label="اسم الفرع">
              <Input value={values.name} onChange={(event) => setField("name", event.target.value)} required />
            </AccountingField>
            <AccountingField label="كود الفرع">
              <Input value={values.code} onChange={(event) => setField("code", event.target.value)} required />
            </AccountingField>
            <AccountingField label="المدينة / المنطقة">
              <Input value={values.city} onChange={(event) => setField("city", event.target.value)} required />
            </AccountingField>
            <AccountingField label="الهاتف">
              <Input value={values.phone} onChange={(event) => setField("phone", event.target.value)} />
            </AccountingField>
            <AccountingField label="العنوان">
              <Input value={values.address} onChange={(event) => setField("address", event.target.value)} />
            </AccountingField>
            <AccountingField label="الحالة">
              <Select value={values.status} onValueChange={(value) => setField("status", value as BranchValues["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">معطل</SelectItem>
                </SelectContent>
              </Select>
            </AccountingField>
            <div className="md:col-span-2">
              <AccountingField label="ملاحظات">
                <Textarea
                  value={values.notes}
                  onChange={(event) => setField("notes", event.target.value)}
                  className="min-h-32"
                />
              </AccountingField>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/accounting/branches")}>
            إلغاء
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "جارٍ الحفظ..." : "حفظ الفرع"}
          </Button>
        </div>
      </form>
    </section>
  );
}
