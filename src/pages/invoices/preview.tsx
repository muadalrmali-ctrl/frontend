import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Printer } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { apiClient } from "@/providers/api-client";
import { InvoicePrintSheet, type InvoicePrintSheetProps } from "@/components/invoices/invoice-print-sheet";

type PreviewSource = "cases" | "sales";

type CaseInvoiceResponse = {
  caseData: {
    id: number;
    caseCode: string;
    technicianName?: string | null;
    notes?: string | null;
    postRepairNote?: string | null;
    operationFinalizedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  customer: { name: string; phone?: string | null } | null;
  device: { applianceType?: string | null; brand?: string | null; modelName?: string | null } | null;
  createdByUser?: { name: string } | null;
  assignedTechnician?: { name: string } | null;
};

type CasePart = {
  id: number;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  inventoryName?: string | null;
  inventoryCode?: string | null;
};

type CaseService = {
  id: number;
  serviceName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

type SaleDetails = {
  invoice: {
    id: number;
    saleCode?: string | null;
    invoiceNumber: string;
    caseId?: number | null;
    caseCode?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    directCustomerName?: string | null;
    directCustomerPhone?: string | null;
    total: string;
    subtotal: string;
    discount: string;
    tax: string;
    notes?: string | null;
    saleDate?: string | null;
    createdAt?: string | null;
    createdByName?: string | null;
    deviceApplianceType?: string | null;
    deviceBrand?: string | null;
    deviceModelName?: string | null;
  };
  items: Array<{
    id: number;
    name: string;
    description?: string | null;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
};

type PreviewState = {
  title: string;
  subtitle: string;
  returnUrl: string;
  returnLabel: string;
  document: InvoicePrintSheetProps;
};

const pageStyles = `
  @page {
    size: A4;
    margin: 12mm;
  }

  @media print {
    body {
      margin: 0 !important;
      background: #ffffff !important;
    }

    .invoice-preview-actions {
      display: none !important;
    }

    .invoice-preview-shell {
      padding: 0 !important;
      background: #ffffff !important;
    }
  }
`;

const formatDate = (value?: string | null) => {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const toNumber = (value?: string | null) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildCasePreviewState = async (id: number): Promise<PreviewState> => {
  const [details, parts, services] = await Promise.all([
    apiClient<CaseInvoiceResponse>(`/api/cases/${id}`),
    apiClient<CasePart[]>(`/api/cases/${id}/parts`),
    apiClient<CaseService[]>(`/api/cases/${id}/services`),
  ]);

  const partItems = parts.map((part) => ({
    id: `part-${part.id}`,
    description: [part.inventoryName || "قطعة", part.inventoryCode].filter(Boolean).join(" - "),
    quantity: part.quantity,
    unitPrice: toNumber(part.unitPrice),
    total: toNumber(part.totalPrice),
  }));

  const serviceItems = services.map((service) => ({
    id: `service-${service.id}`,
    description: service.serviceName,
    quantity: service.quantity,
    unitPrice: toNumber(service.unitPrice),
    total: toNumber(service.totalPrice),
  }));

  const subtotal =
    parts.reduce((sum, part) => sum + toNumber(part.totalPrice), 0) +
    services.reduce((sum, service) => sum + toNumber(service.totalPrice), 0);

  return {
    title: "معاينة فاتورة الحالة",
    subtitle: `حالة ${details.caseData.caseCode}`,
    returnUrl: `/cases/${id}`,
    returnLabel: "العودة إلى الحالة",
    document: {
      invoiceCode: details.caseData.caseCode,
      customerName: details.customer?.name || "العميل",
      customerPhone: details.customer?.phone || null,
      invoiceDate: formatDate(
        details.caseData.operationFinalizedAt || details.caseData.updatedAt || details.caseData.createdAt
      ),
      staffName:
        details.assignedTechnician?.name ||
        details.caseData.technicianName ||
        details.createdByUser?.name ||
        "غير محدد",
      caseCode: details.caseData.caseCode,
      deviceLabel: [details.device?.brand, details.device?.applianceType, details.device?.modelName]
        .filter(Boolean)
        .join(" - ") || null,
      notes: details.caseData.postRepairNote || details.caseData.notes || null,
      subtotal,
      total: subtotal,
      items: [...partItems, ...serviceItems],
    },
  };
};

const buildSalePreviewState = async (id: number): Promise<PreviewState> => {
  const details = await apiClient<SaleDetails>(`/api/invoices/${id}`);
  const sale = details.invoice;

  return {
    title: "معاينة فاتورة البيع",
    subtitle: sale.saleCode || sale.invoiceNumber,
    returnUrl: `/sales/${id}`,
    returnLabel: "العودة إلى البيع",
    document: {
      invoiceCode: sale.saleCode || sale.invoiceNumber,
      customerName: sale.customerName || sale.directCustomerName || "العميل",
      customerPhone: sale.customerPhone || sale.directCustomerPhone || null,
      invoiceDate: formatDate(sale.saleDate || sale.createdAt),
      staffName: sale.createdByName || null,
      caseCode: sale.caseCode || null,
      deviceLabel: [sale.deviceBrand, sale.deviceApplianceType, sale.deviceModelName].filter(Boolean).join(" - ") || null,
      notes: sale.notes || null,
      subtotal: toNumber(sale.subtotal),
      discount: toNumber(sale.discount),
      tax: toNumber(sale.tax),
      total: toNumber(sale.total),
      items: details.items.map((item) => ({
        id: String(item.id),
        description: item.description ? `${item.name} - ${item.description}` : item.name,
        quantity: item.quantity,
        unitPrice: toNumber(item.unitPrice),
        total: toNumber(item.totalPrice),
      })),
    },
  };
};

export function InvoicePreviewPage() {
  const { source, id } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizedSource = useMemo<PreviewSource | null>(() => {
    if (source === "cases" || source === "sales") return source;
    return null;
  }, [source]);

  useEffect(() => {
    const numericId = Number(id);
    if (!normalizedSource || !Number.isFinite(numericId)) {
      setError("رابط معاينة الفاتورة غير صالح.");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const result =
          normalizedSource === "cases"
            ? await buildCasePreviewState(numericId)
            : await buildSalePreviewState(numericId);

        if (active) {
          setPreview(result);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "تعذر تحميل بيانات الفاتورة.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [id, normalizedSource]);

  return (
    <section
      className="invoice-preview-shell"
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <style>{pageStyles}</style>

      <div
        className="invoice-preview-actions"
        style={{
          maxWidth: "1100px",
          margin: "0 auto 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: "6px" }}>
          <button
            type="button"
            onClick={() => (preview ? navigate(preview.returnUrl) : navigate(-1))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              background: "transparent",
              color: "#3f424e",
              cursor: "pointer",
              fontSize: "15px",
              padding: 0,
            }}
          >
            <ArrowRight size={18} />
            {preview?.returnLabel || "العودة"}
          </button>
          <h1 style={{ margin: 0, fontSize: "30px", fontWeight: 700, color: "#3f424e" }}>
            {preview?.title || "معاينة الفاتورة"}
          </h1>
          <p style={{ margin: 0, color: "#6b7280" }}>
            {preview?.subtitle || "صفحة طباعة مستقلة وآمنة للفاتورة."}
          </p>
        </div>

        {preview ? (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "12px",
                border: "1px solid #e7ebef",
                background: "#ffffff",
                color: "#3f424e",
                padding: "12px 18px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Printer size={18} />
              طباعة الفاتورة
            </button>
            <Link
              to={preview.returnUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "12px",
                border: "1px solid #e7ebef",
                background: "#ffffff",
                color: "#3f424e",
                padding: "12px 18px",
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              العودة
            </Link>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div style={{ maxWidth: "1100px", margin: "0 auto", color: "#6b7280" }}>جارٍ تحميل الفاتورة...</div>
      ) : null}

      {error ? (
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            border: "1px solid #f1b8b8",
            background: "#fff1f1",
            color: "#b42318",
            borderRadius: "14px",
            padding: "16px 18px",
          }}
        >
          {error}
        </div>
      ) : null}

      {!loading && !error && preview ? <InvoicePrintSheet {...preview.document} /> : null}
    </section>
  );
}
