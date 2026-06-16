import { useEffect, useState } from "react";
import { useList, useNotification } from "@refinedev/core";
import { Link } from "react-router";
import { CheckCircle2, Eye } from "lucide-react";
import { AttachmentGallery } from "@/components/cases/case-attachments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { filterAttachments, normalizeCaseAttachments, type CaseAttachment, type RawCaseAttachment } from "@/lib/case-attachments";
import { apiClient } from "@/providers/api-client";
import { hasPermission } from "@/lib/access-control";
import { getStoredUser } from "@/providers/auth-provider";

type IncomingCase = {
  id: number;
  caseCode: string;
  customerComplaint: string;
  createdAt?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deviceApplianceType?: string | null;
  deviceBrand?: string | null;
  deviceModelName?: string | null;
  receptionPointName?: string | null;
  receptionPointCity?: string | null;
  transferStatus: string;
};

export function IncomingReceptionCasesPage() {
  const { open } = useNotification();
  const currentUser = getStoredUser();
  const canReceiveAtMainCenter = hasPermission(currentUser, "reception_points.receive_cases");
  const { result, query } = useList<IncomingCase>({ resource: "incoming-reception-cases" });
  const [attachmentsByCase, setAttachmentsByCase] = useState<Record<number, CaseAttachment[]>>({});
  const [selectedCase, setSelectedCase] = useState<IncomingCase | null>(null);
  const [receiptNotes, setReceiptNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cases = result.data ?? [];

  useEffect(() => {
    let cancelled = false;
    if (cases.length === 0) {
      setAttachmentsByCase({});
      return;
    }

    Promise.all(
      cases.map(async (item) => {
        try {
          const media = await apiClient<RawCaseAttachment[]>(`/api/media/case/${item.id}`);
          return [
            item.id,
            filterAttachments(normalizeCaseAttachments(media), { category: "reception_point_intake" }),
          ] as const;
        } catch {
          return [item.id, []] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) setAttachmentsByCase(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [cases]);

  const receiveCase = async () => {
    if (!selectedCase) return;
    setIsSubmitting(true);
    try {
      await apiClient(`/api/cases/${selectedCase.id}/receive-at-main-center`, {
        method: "PATCH",
        body: { notes: receiptNotes.trim() || null },
      });
      open?.({ type: "success", message: "تم استلام الحالة في المركز الرئيسي" });
      setSelectedCase(null);
      setReceiptNotes("");
      await query.refetch();
    } catch (error) {
      open?.({ type: "error", message: error instanceof Error ? error.message : "تعذر استلام الحالة" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-semibold">استلام الحالات من نقاط الاستلام</h1>
        <p className="text-muted-foreground">الحالات المرسلة إلى المركز الرئيسي بانتظار تأكيد الاستلام.</p>
      </div>

      {query.error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{query.error.message}</p> : null}
      {query.isLoading ? <p className="text-muted-foreground">جار تحميل الحالات القادمة...</p> : null}

      <div className="grid gap-4">
        {cases.map((item) => {
          const attachments = attachmentsByCase[item.id] ?? [];
          return (
            <Card key={item.id} className="rounded-lg">
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-xl">{item.caseCode}</CardTitle>
                  <p className="text-sm text-muted-foreground">{item.receptionPointName || "نقطة استلام"} - {item.receptionPointCity || "مدينة غير محددة"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild><Link to={`/cases/${item.id}`}><Eye /> عرض</Link></Button>
                  {canReceiveAtMainCenter ? (
                    <Button onClick={() => setSelectedCase(item)}><CheckCircle2 /> تم الاستلام في المركز</Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div className="grid gap-2 text-sm">
                  <Info label="العميل" value={`${item.customerName || "غير محدد"}${item.customerPhone ? ` - ${item.customerPhone}` : ""}`} />
                  <Info label="الجهاز" value={[item.deviceBrand, item.deviceApplianceType, item.deviceModelName].filter(Boolean).join(" ") || "غير محدد"} />
                  <Info label="وصف العطل" value={item.customerComplaint} />
                  <Info label="تاريخ الإنشاء" value={item.createdAt ? new Date(item.createdAt).toLocaleString("ar") : "غير محدد"} />
                </div>
                <div>
                  {attachments.length > 0 ? <AttachmentGallery attachments={attachments.slice(0, 3)} emptyMessage="لا توجد مرفقات استقبال." /> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">لا توجد مرفقات استقبال.</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!query.isLoading && cases.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">لا توجد حالات قادمة من نقاط الاستلام حالياً.</p> : null}

      <Dialog open={Boolean(selectedCase)} onOpenChange={(open) => !open && setSelectedCase(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تأكيد الاستلام في المركز</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">سيتم نقل الحالة إلى مرحلة حالة جديدة ومتابعتها ضمن سير العمل العادي.</p>
          <Textarea placeholder="ملاحظات الاستلام في المركز" value={receiptNotes} onChange={(event) => setReceiptNotes(event.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCase(null)}>إلغاء</Button>
            <Button onClick={receiveCase} disabled={isSubmitting}>{isSubmitting ? "جار الحفظ..." : "تأكيد الاستلام"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <p><span className="font-bold text-foreground">{label}: </span><span className="text-muted-foreground">{value}</span></p>;
}
