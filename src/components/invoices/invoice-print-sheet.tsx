import type { CSSProperties, ReactNode } from "react";

type InvoicePrintLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax?: number;
  total: number;
};

type InvoicePrintSheetProps = {
  invoiceCode: string;
  customerName: string;
  invoiceDate: string;
  staffName?: string | null;
  customerPhone?: string | null;
  caseCode?: string | null;
  deviceLabel?: string | null;
  notes?: string | null;
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  items: InvoicePrintLineItem[];
};

const formatMoney = (value: number) =>
  `${value.toLocaleString("ar-LY", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ل`;

const boxStyle: CSSProperties = {
  border: "1px solid #d7dee7",
  borderRadius: "14px",
  padding: "14px 16px",
  background: "#ffffff",
};

export function InvoicePrintSheet({
  invoiceCode,
  customerName,
  invoiceDate,
  staffName,
  customerPhone,
  caseCode,
  deviceLabel,
  notes,
  subtotal,
  discount = 0,
  tax = 0,
  total,
  items,
}: InvoicePrintSheetProps) {
  return (
    <div
      dir="rtl"
      style={{
        width: "100%",
        maxWidth: "980px",
        margin: "0 auto",
        background: "#ffffff",
        color: "#3f424e",
        fontFamily: "\"Tajawal\", Tahoma, Arial, sans-serif",
        padding: "32px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "24px",
          borderBottom: "1px solid #d7dee7",
          paddingBottom: "24px",
        }}
      >
        <div style={{ textAlign: "right" }}>
          <h1 style={{ margin: 0, fontSize: "36px", fontWeight: 700, color: "#3f424e" }}>شركة الجهاد</h1>
          <p style={{ margin: "10px 0 0", fontSize: "17px", color: "#4b5563" }}>
            لاستيراد الأجهزة الكهرومنزلية | جملة وقطاعي
          </p>
        </div>
        <div style={{ textAlign: "left" }}>
          <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.25em", color: "#9ca3af", textTransform: "uppercase" }}>
            Invoice
          </p>
          <p style={{ margin: "12px 0 0", fontSize: "34px", fontWeight: 700, color: "#01b224" }}>{invoiceCode}</p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "18px",
          marginTop: "26px",
        }}
      >
        <div style={{ display: "grid", gap: "12px" }}>
          <InfoBox label="العميل" value={customerName} />
          {customerPhone ? <InfoBox label="الهاتف" value={customerPhone} /> : null}
          {caseCode ? <InfoBox label="رقم الحالة" value={caseCode} /> : null}
          {deviceLabel ? <InfoBox label="الجهاز" value={deviceLabel} /> : null}
        </div>
        <div style={{ display: "grid", gap: "12px" }}>
          <InfoBox label="تاريخ الفاتورة" value={invoiceDate} />
          <InfoBox label="الموظف" value={staffName || "غير محدد"} />
          <InfoBox label="عدد البنود" value={String(items.length)} />
          <InfoBox label="المرجع" value={invoiceCode} />
        </div>
      </div>

      <div style={{ marginTop: "26px", border: "1px solid #d7dee7", borderRadius: "16px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6", color: "#4b5563" }}>
              <HeaderCell>الوصف</HeaderCell>
              <HeaderCell>الكمية</HeaderCell>
              <HeaderCell>سعر الوحدة</HeaderCell>
              <HeaderCell>الضريبة</HeaderCell>
              <HeaderCell>الإجمالي</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{ padding: "22px 16px", textAlign: "center", color: "#6b7280", borderTop: "1px solid #e5e7eb" }}
                >
                  لا توجد بنود مسجلة في هذه الفاتورة.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id} style={{ background: index % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                  <BodyCell emphasized>{item.description}</BodyCell>
                  <BodyCell>{String(item.quantity)}</BodyCell>
                  <BodyCell>{formatMoney(item.unitPrice)}</BodyCell>
                  <BodyCell>{formatMoney(item.tax || 0)}</BodyCell>
                  <BodyCell emphasized>{formatMoney(item.total)}</BodyCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <div
          style={{
            width: "100%",
            maxWidth: "340px",
            border: "1px solid #d7dee7",
            borderRadius: "16px",
            background: "#f9fafb",
            padding: "18px 20px",
            boxSizing: "border-box",
          }}
        >
          <SummaryRow label="الإجمالي الفرعي" value={formatMoney(subtotal)} />
          <SummaryRow label="الخصم" value={formatMoney(discount)} />
          <SummaryRow label="الضريبة" value={formatMoney(tax)} />
          <div style={{ borderTop: "1px solid #d7dee7", marginTop: "12px", paddingTop: "12px" }}>
            <SummaryRow label="الإجمالي النهائي" value={formatMoney(total)} emphasized />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 0.7fr",
          gap: "20px",
          marginTop: "28px",
        }}
      >
        <div style={{ ...boxStyle, minHeight: "150px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#3f424e" }}>ملاحظات وشروط</h2>
          <ul style={{ margin: "14px 0 0", paddingInlineStart: "20px", color: "#4b5563", lineHeight: 1.9, fontSize: "14px" }}>
            <li>تخضع جميع السلع لشروطنا وأحكامنا.</li>
            <li>الضمان يشمل عيوب التصنيع ولا يشمل سوء الاستخدام أو الحوادث.</li>
            <li>{notes?.trim() || "يرجى الاحتفاظ بالفاتورة للمتابعة وخدمات ما بعد البيع."}</li>
          </ul>
        </div>
        <div
          style={{
            border: "1px dashed #c7ced8",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "150px",
            color: "#6b7280",
            background: "#ffffff",
            textAlign: "center",
            padding: "18px",
            boxSizing: "border-box",
          }}
        >
          شكراً لتعاملكم معنا
        </div>
      </div>
    </div>
  );
}

function HeaderCell({ children }: { children: ReactNode }) {
  return <th style={{ padding: "14px 16px", fontWeight: 700, fontSize: "14px", textAlign: "right" }}>{children}</th>;
}

function BodyCell({
  children,
  emphasized = false,
}: {
  children: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <td
      style={{
        padding: "14px 16px",
        borderTop: "1px solid #e5e7eb",
        fontSize: "14px",
        color: "#3f424e",
        fontWeight: emphasized ? 700 : 500,
        textAlign: "right",
      }}
    >
      {children}
    </td>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={boxStyle}>
      <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "16px", color: "#3f424e", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        marginTop: "8px",
        color: emphasized ? "#3f424e" : "#4b5563",
        fontWeight: emphasized ? 700 : 500,
        fontSize: emphasized ? "18px" : "15px",
      }}
    >
      <span>{label}</span>
      <span style={{ color: emphasized ? "#01b224" : "#3f424e" }}>{value}</span>
    </div>
  );
}

export type { InvoicePrintLineItem, InvoicePrintSheetProps };
