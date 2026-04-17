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

  useEffect(() => {
    apiClient<BranchDetails>(`/api/branches/${id}`).then(setBranch).catch(() => setBranch(null));
  }, [id]);

  if (!branch) {
    return <section dir="rtl" className="space-y-6"><p className="text-muted-foreground">جارٍ تحميل بيانات الفرع...</p></section>;
  }

  return (
    <BranchFormPage
      title="تعديل الفرع"
      description="تحديث بيانات الفرع وحالة التفعيل."
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
