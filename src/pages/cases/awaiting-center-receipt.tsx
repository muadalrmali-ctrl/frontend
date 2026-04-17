import { useEffect, useMemo, useState } from "react";
import { useCustom, useNotification } from "@refinedev/core";
import { Link } from "react-router";
import { CheckCircle2, ImageIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiClient } from "@/providers/api-client";

type CenterReceiptCase = {
  id: number;
  caseCode: string;
  sourceType: string;
  branchId?: number | null;
  branchNotes?: string | null;
  status: string;
  createdAt?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  branchName?: string | null;
  branchCode?: string | null;
  deviceApplianceType?: string | null;
  deviceBrand?: string | null;
  deviceModelName?: string | null;
};

type MediaRecord = {
  id: number;
  fileType: string;
  category?: string | null;
  publicUrl?: string | null;
  fileUrl: string;
};

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";

const getDeviceName = (caseItem: CenterReceiptCase) =>
  [caseItem.deviceBrand, caseItem.deviceApplianceType, caseItem.deviceModelName].filter(Boolean).join(" ") || "-";

export function CenterReceiptCasesPage() {
  const { open } = useNotification();
  const [search, setSearch] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("all");
  const [receivingCaseId, setReceivingCaseId] = useState<number | null>(null);
  const [handoffImagesByCase, setHandoffImagesByCase] = useState<Record<number, string[]>>({});

  const { result, query } = useCustom<CenterReceiptCase[]>({
    url: "/api/cases/awaiting-center-receipt",
    method: "get",
  });

  const cases = useMemo(() => result?.data ?? [], [result?.data]);
  const branchOptions = useMemo(
    () =>
      cases
        .filter((caseItem) => caseItem.branchId && caseItem.branchName)
        .map((caseItem) => ({
          id: caseItem.branchId as number,
          name: caseItem.branchName as string,
        }))
        .filter((branch, index, array) => array.findIndex((item) => item.id === branch.id) === index),
    [cases]
  );

  useEffect(() => {
    let cancelled = false;

    const loadHandoffImages = async () => {
      try {
        const entries = await Promise.all(
          cases.map(async (caseItem) => {
            const media = await apiClient<MediaRecord[]>(`/api/media/case/${caseItem.id}`).catch(() => []);
            const images = media
              .filter((item) => item.category === "branch_handoff" && item.fileType === "image")
              .map((item) => item.publicUrl || item.fileUrl)
              .filter((url): url is string => Boolean(url));

            return [caseItem.id, images] as const;
          })
        );

        if (!cancelled) {
          setHandoffImagesByCase(Object.fromEntries(entries));
        }
      } catch {
        if (!cancelled) {
          setHandoffImagesByCase({});
        }
      }
    };

    if (cases.length > 0) {
      loadHandoffImages();
    } else {
      setHandoffImagesByCase({});
    }

    return () => {
      cancelled = true;
    };
  }, [cases]);

  const filteredCases = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return cases.filter((caseItem) => {
      if (selectedBranchId !== "all" && String(caseItem.branchId ?? "") !== selectedBranchId) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [caseItem.caseCode, caseItem.customerName, caseItem.branchName, caseItem.branchCode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [cases, search, selectedBranchId]);

  const confirmReceipt = async (id: number) => {
    try {
      setReceivingCaseId(id);
      await apiClient(`/api/cases/${id}/center-receipt`, {
        method: "PATCH",
        body: {},
      });
      await query.refetch();
      open?.({
        type: "success",
        message: "تم تسجيل الاستلام في المركز",
        description: "تم نقل الحالة إلى دورة المركز الداخلية بنجاح.",
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "تعذر تسجيل الاستلام",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
      });
    } finally {
      setReceivingCaseId(null);
    }
  };

  return (
    <section className="space-y-6" dir="rtl">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">الحالات بانتظار الاستلام في المركز</h1>
        <p className="text-muted-foreground">
          هذه الصفحة مخصصة للحالات القادمة من الفروع قبل إدخالها إلى سير العمل الداخلي في المركز الرئيسي.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_260px_auto] lg:items-center">
          <div className="relative w-full">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pr-9"
              placeholder="ابحث برقم الحالة أو اسم العميل أو الفرع"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger>
              <SelectValue placeholder="كل الفروع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفروع</SelectItem>
              {branchOptions.map((branch) => (
                <SelectItem key={branch.id} value={String(branch.id)}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="text-sm font-medium text-muted-foreground">{filteredCases.length} حالة</div>
        </CardContent>
      </Card>

      {query.isLoading ? <p className="text-muted-foreground">جارٍ تحميل الحالات...</p> : null}
      {query.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {query.error.message}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>قائمة الاستلام من الفروع</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الحالة</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">الفرع</TableHead>
                <TableHead className="text-right">الجهاز</TableHead>
                <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                <TableHead className="text-right">ملاحظات الفرع</TableHead>
                <TableHead className="text-right">صور الإرسال</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((caseItem) => {
                const handoffImages = handoffImagesByCase[caseItem.id] ?? [];

                return (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-medium">{caseItem.caseCode}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{caseItem.customerName || "-"}</p>
                        <p className="text-xs text-muted-foreground">{caseItem.customerPhone || "بدون هاتف"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{caseItem.branchName || "-"}</p>
                        <p className="text-xs text-muted-foreground">{caseItem.branchCode || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getDeviceName(caseItem)}</TableCell>
                    <TableCell>{formatDate(caseItem.createdAt)}</TableCell>
                    <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                      <p className="line-clamp-3">{caseItem.branchNotes || "لا توجد ملاحظات"}</p>
                    </TableCell>
                    <TableCell>
                      {handoffImages.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {handoffImages.slice(0, 3).map((imageUrl, index) => (
                            <a
                              key={`${caseItem.id}-${index}`}
                              href={imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <img
                                src={imageUrl}
                                alt={`handoff-${caseItem.caseCode}-${index + 1}`}
                                className="size-12 rounded-lg border object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ImageIcon className="size-4" />
                          لا توجد صور
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/cases/${caseItem.id}`}>فتح التفاصيل</Link>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => confirmReceipt(caseItem.id)}
                          disabled={receivingCaseId === caseItem.id}
                        >
                          <CheckCircle2 className="size-4" />
                          {receivingCaseId === caseItem.id ? "جارٍ التسجيل..." : "تم الاستلام في المركز"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!filteredCases.length && !query.isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    لا توجد حالات بانتظار الاستلام في المركز حاليًا.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
