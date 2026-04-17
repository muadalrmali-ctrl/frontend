import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { apiClient } from "@/providers/api-client";
import { BranchFormPage } from "./branch-form";

type BranchDetails = {
  id: number;
  name: string;
  code: string;
  city: string;
  address?: string | null;
  phone?: string | null;
  status: "active" | "inactive";
  notes?: string | null;
};

export function BranchEditPage() {
  const { id } = useParams();
  const [branch, setBranch] = useState<BranchDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    apiClient<BranchDetails>(`/api/branches/${id}`)
      .then((data) => {
        setBranch(data);
        setError(null);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "تعذر تحميل بيانات الفرع");
      });
  }, [id]);

  if (error) {
    return (
      <section dir="rtl" className="space-y-6">
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      </section>
    );
  }

  if (!branch) {
    return (
      <section dir="rtl" className="space-y-6">
        <p className="text-muted-foreground">جارٍ تحميل بيانات الفرع...</p>
      </section>
    );
  }

  return (
    <BranchFormPage
      title="تعديل الفرع"
      description="تحديث بيانات الفرع وحالة التفعيل وربطها بالنظام الحالي."
      branchId={branch.id}
      initialValues={{
        name: branch.name,
        code: branch.code,
        city: branch.city,
        address: branch.address || "",
        phone: branch.phone || "",
        status: branch.status,
        notes: branch.notes || "",
      }}
    />
  );
}
