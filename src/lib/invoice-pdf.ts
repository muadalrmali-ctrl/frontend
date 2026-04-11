import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export type InvoicePdfItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax?: number;
  total: number;
};

export type InvoicePdfData = {
  fileName: string;
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
  items: InvoicePdfItem[];
};

const formatMoney = (value: number) =>
  `${value.toLocaleString("ar-LY", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ل`;

const createCell = (text: string, styles: Partial<CSSStyleDeclaration> = {}) => {
  const cell = document.createElement("div");
  cell.textContent = text;
  Object.assign(cell.style, styles);
  return cell;
};

const createInfoBox = (label: string, value: string) => {
  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    border: "1px solid #dbe1ea",
    borderRadius: "14px",
    padding: "14px 16px",
    background: "#ffffff",
  } satisfies Partial<CSSStyleDeclaration>);

  const labelNode = document.createElement("div");
  labelNode.textContent = label;
  Object.assign(labelNode.style, {
    color: "#7a8599",
    fontSize: "13px",
    marginBottom: "6px",
  } satisfies Partial<CSSStyleDeclaration>);

  const valueNode = document.createElement("div");
  valueNode.textContent = value;
  Object.assign(valueNode.style, {
    color: "#172033",
    fontSize: "16px",
    fontWeight: "600",
  } satisfies Partial<CSSStyleDeclaration>);

  wrapper.append(labelNode, valueNode);
  return wrapper;
};

const buildInvoicePdfElement = (data: InvoicePdfData) => {
  const root = document.createElement("div");
  Object.assign(root.style, {
    width: "794px",
    background: "#ffffff",
    color: "#172033",
    padding: "40px",
    boxSizing: "border-box",
    direction: "rtl",
    fontFamily: "Tahoma, Arial, sans-serif",
  } satisfies Partial<CSSStyleDeclaration>);

  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1px solid #dbe1ea",
    paddingBottom: "28px",
  } satisfies Partial<CSSStyleDeclaration>);

  const company = document.createElement("div");
  company.append(
    createCell("شركة الجهاد", {
      fontSize: "34px",
      fontWeight: "700",
      color: "#172033",
      marginBottom: "8px",
    }),
    createCell("لاستيراد الأجهزة الكهرومنزلية | جملة وقطاعي", {
      fontSize: "18px",
      color: "#64748b",
    })
  );

  const invoiceMeta = document.createElement("div");
  Object.assign(invoiceMeta.style, {
    textAlign: "left",
  } satisfies Partial<CSSStyleDeclaration>);
  invoiceMeta.append(
    createCell("Invoice", {
      fontSize: "12px",
      letterSpacing: "0.3em",
      textTransform: "uppercase",
      color: "#94a3b8",
      marginBottom: "12px",
    }),
    createCell(data.invoiceCode, {
      fontSize: "38px",
      fontWeight: "700",
      color: "#73a833",
    })
  );

  header.append(company, invoiceMeta);

  const infoGrid = document.createElement("div");
  Object.assign(infoGrid.style, {
    display: "grid",
    gridTemplateColumns: "1.15fr 0.85fr",
    gap: "24px",
    marginTop: "28px",
  } satisfies Partial<CSSStyleDeclaration>);

  const customerPanel = document.createElement("div");
  Object.assign(customerPanel.style, {
    display: "grid",
    gap: "14px",
  } satisfies Partial<CSSStyleDeclaration>);
  customerPanel.append(
    createInfoBox("العميل", data.customerName),
    ...(data.customerPhone ? [createInfoBox("الهاتف", data.customerPhone)] : []),
    ...(data.caseCode ? [createInfoBox("رقم الحالة", data.caseCode)] : []),
    ...(data.deviceLabel ? [createInfoBox("الجهاز", data.deviceLabel)] : [])
  );

  const metaPanel = document.createElement("div");
  Object.assign(metaPanel.style, {
    display: "grid",
    gap: "14px",
  } satisfies Partial<CSSStyleDeclaration>);
  metaPanel.append(
    createInfoBox("تاريخ الفاتورة", data.invoiceDate),
    createInfoBox("الموظف", data.staffName || "غير محدد"),
    createInfoBox("عدد البنود", String(data.items.length)),
    createInfoBox("المرجع", data.invoiceCode)
  );

  infoGrid.append(customerPanel, metaPanel);

  const table = document.createElement("div");
  Object.assign(table.style, {
    marginTop: "28px",
    border: "1px solid #dbe1ea",
    borderRadius: "18px",
    overflow: "hidden",
  } satisfies Partial<CSSStyleDeclaration>);

  const headerRow = document.createElement("div");
  Object.assign(headerRow.style, {
    display: "grid",
    gridTemplateColumns: "2.4fr 0.8fr 1fr 0.9fr 1.1fr",
    background: "#eef2f7",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "600",
  } satisfies Partial<CSSStyleDeclaration>);
  ["الوصف", "الكمية", "سعر الوحدة", "الضريبة", "الإجمالي"].forEach((label) => {
    headerRow.append(
      createCell(label, {
        padding: "14px 16px",
      })
    );
  });
  table.appendChild(headerRow);

  if (data.items.length === 0) {
    table.append(
      createCell("لا توجد بنود مسجلة في هذه الفاتورة.", {
        padding: "22px 16px",
        textAlign: "center",
        color: "#64748b",
        fontSize: "14px",
      })
    );
  } else {
    data.items.forEach((item, index) => {
      const row = document.createElement("div");
      Object.assign(row.style, {
        display: "grid",
        gridTemplateColumns: "2.4fr 0.8fr 1fr 0.9fr 1.1fr",
        background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
        borderTop: "1px solid #e2e8f0",
        fontSize: "14px",
        color: "#172033",
      } satisfies Partial<CSSStyleDeclaration>);

      row.append(
        createCell(item.description, { padding: "14px 16px", fontWeight: "600" }),
        createCell(String(item.quantity), { padding: "14px 16px" }),
        createCell(formatMoney(item.unitPrice), { padding: "14px 16px" }),
        createCell(formatMoney(item.tax || 0), { padding: "14px 16px" }),
        createCell(formatMoney(item.total), { padding: "14px 16px", fontWeight: "700" })
      );

      table.appendChild(row);
    });
  }

  const summaryWrap = document.createElement("div");
  Object.assign(summaryWrap.style, {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "24px",
  } satisfies Partial<CSSStyleDeclaration>);

  const summary = document.createElement("div");
  Object.assign(summary.style, {
    width: "100%",
    maxWidth: "320px",
    background: "#f8fafc",
    borderRadius: "18px",
    padding: "18px 20px",
    display: "grid",
    gap: "12px",
  } satisfies Partial<CSSStyleDeclaration>);

  const appendSummaryRow = (label: string, value: string, emphasized = false) => {
    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "12px",
      fontSize: emphasized ? "18px" : "15px",
      color: emphasized ? "#172033" : "#475569",
      fontWeight: emphasized ? "700" : "500",
    } satisfies Partial<CSSStyleDeclaration>);

    const labelNode = createCell(label, {});
    const valueNode = createCell(value, {
      color: emphasized ? "#73a833" : "#172033",
      fontWeight: emphasized ? "700" : "600",
    });
    row.append(labelNode, valueNode);
    summary.appendChild(row);
  };

  appendSummaryRow("الإجمالي الفرعي", formatMoney(data.subtotal));
  appendSummaryRow("الخصم", formatMoney(data.discount || 0));
  appendSummaryRow("الضريبة", formatMoney(data.tax || 0));

  const divider = document.createElement("div");
  divider.style.borderTop = "1px solid #dbe1ea";
  divider.style.paddingTop = "12px";
  summary.appendChild(divider);
  appendSummaryRow("الإجمالي النهائي", formatMoney(data.total), true);

  summaryWrap.appendChild(summary);

  const footer = document.createElement("div");
  Object.assign(footer.style, {
    display: "grid",
    gridTemplateColumns: "1.25fr 0.75fr",
    gap: "24px",
    marginTop: "30px",
  } satisfies Partial<CSSStyleDeclaration>);

  const notesBox = document.createElement("div");
  Object.assign(notesBox.style, {
    border: "1px solid #dbe1ea",
    borderRadius: "18px",
    padding: "18px 20px",
  } satisfies Partial<CSSStyleDeclaration>);
  notesBox.append(
    createCell("ملاحظات وشروط", {
      fontSize: "18px",
      fontWeight: "700",
      marginBottom: "12px",
    }),
    createCell("تخضع جميع السلع لشروطنا وأحكامنا.", {
      fontSize: "14px",
      color: "#475569",
      marginBottom: "8px",
      lineHeight: "1.8",
    }),
    createCell("الضمان يشمل عيوب التصنيع ولا يشمل سوء الاستخدام أو الحوادث.", {
      fontSize: "14px",
      color: "#475569",
      marginBottom: "8px",
      lineHeight: "1.8",
    }),
    createCell(data.notes?.trim() || "يرجى الاحتفاظ بالفاتورة للمتابعة وخدمات ما بعد البيع.", {
      fontSize: "14px",
      color: "#475569",
      lineHeight: "1.8",
    })
  );

  const thanks = document.createElement("div");
  Object.assign(thanks.style, {
    border: "1px dashed #cbd5e1",
    borderRadius: "18px",
    padding: "28px 20px",
    color: "#94a3b8",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  } satisfies Partial<CSSStyleDeclaration>);
  thanks.textContent = "شكراً لتعاملكم معنا";

  footer.append(notesBox, thanks);
  root.append(header, infoGrid, table, summaryWrap, footer);

  return root;
};

export const downloadInvoicePdf = async (data: InvoicePdfData) => {
  const element = buildInvoicePdfElement(data);
  const wrapper = document.createElement("div");

  Object.assign(wrapper.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "794px",
    background: "#ffffff",
    pointerEvents: "none",
    zIndex: "-1",
  } satisfies Partial<CSSStyleDeclaration>);

  wrapper.appendChild(element);
  document.body.appendChild(wrapper);

  try {
    if ("fonts" in document) {
      await (document as Document & { fonts?: { ready: Promise<void> } }).fonts?.ready;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width: 794,
      windowWidth: 794,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const imageData = canvas.toDataURL("image/png");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;

    let remainingHeight = imageHeight;
    let positionY = margin;

    pdf.addImage(imageData, "PNG", margin, positionY, imageWidth, imageHeight, undefined, "FAST");
    remainingHeight -= pageHeight;

    while (remainingHeight > 0) {
      positionY = remainingHeight - imageHeight + margin;
      pdf.addPage();
      pdf.addImage(imageData, "PNG", margin, positionY, imageWidth, imageHeight, undefined, "FAST");
      remainingHeight -= pageHeight;
    }

    pdf.save(`${data.fileName}.pdf`);
  } finally {
    wrapper.remove();
  }
};
