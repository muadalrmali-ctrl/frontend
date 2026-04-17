import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/providers/api-client";
import { AccountingPageIntro, ErrorBanner, formatDate } from "../shared";

type Device = {
  id: number;
  applianceType: string;
  brand: string;
  modelName: string;
  modelCode?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export function AccountingDeviceDetailsPage() {
  const { id } = useParams();
  const [device, setDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<Device>(`/api/devices/${id}`)
      .then(setDevice)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "تعذر تحميل الجهاز"));
  }, [id]);

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AccountingPageIntro title={device ? `${device.brand} ${device.modelName}` : "تفاصيل الجهاز"} description="عرض بيانات الجهاز المرجعية داخل المحاسبة." backTo="/accounting/devices" backLabel="العودة إلى الأجهزة" />
        <Button asChild variant="outline"><Link to={`/accounting/devices/${id}/edit`}>تعديل الجهاز</Link></Button>
      </div>
      <ErrorBanner message={error} />
      {device ? (
        <Card>
          <CardHeader><CardTitle>بيانات الجهاز</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Info label="نوع الجهاز" value={device.applianceType} />
            <Info label="الماركة" value={device.brand} />
            <Info label="اسم الموديل" value={device.modelName} />
            <Info label="كود الموديل" value={device.modelCode || "-"} />
            <Info label="تاريخ الإضافة" value={formatDate(device.createdAt)} />
            <Info label="آخر تحديث" value={formatDate(device.updatedAt)} />
            <div className="md:col-span-2"><Info label="ملاحظات" value={device.notes || "-"} /></div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-muted/20 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>;
}
