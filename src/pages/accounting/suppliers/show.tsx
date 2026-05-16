import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/providers/api-client";
import { AccountingPageIntro, ErrorBanner } from "../shared";

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

export function AccountingSupplierDetailsPage() {
  const { id } = useParams();
  const [details, setDetails] = useState<SupplierDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<SupplierDetails>(`/api/accounting/suppliers/${id}`)
      .then(setDetails)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "تعذر تحميل المورد"));
  }, [id]);

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro
          title={details?.supplier.name || "تفاصيل المورد"}
          description="عرض بيانات المورد ومعلومات التواصل."
          backTo="/accounting/suppliers"
          backLabel="العودة إلى الموردين"
        />
        <Button asChild variant="outline">
          <Link to={`/accounting/suppliers/${id}/edit`}>تعديل المورد</Link>
        </Button>
      </div>

      <ErrorBanner message={error} />

      {details ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <SummaryCard label="جهة الاتصال" value={details.supplier.contactPerson || "-"} />
            <SummaryCard label="الهاتف" value={details.supplier.phone || "-"} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>بيانات المورد</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Info label="الاسم" value={details.supplier.name} />
              <Info label="الهاتف" value={details.supplier.phone || "-"} />
              <Info label="البريد الإلكتروني" value={details.supplier.email || "-"} />
              <Info label="العنوان" value={details.supplier.address || "-"} />
              <div className="md:col-span-2">
                <Info label="ملاحظات" value={details.supplier.notes || "-"} />
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
