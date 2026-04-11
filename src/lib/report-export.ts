import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

type ExportColumn = {
  key: string;
  label: string;
};

type ExportReport = {
  title: string;
  generatedAt: string;
  filters: Record<string, string>;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
};

const formatCellValue = (value: unknown) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
};

export const exportReportToExcel = (report: ExportReport, fileName: string) => {
  const workbook = XLSX.utils.book_new();
  const filterRows = Object.entries(report.filters).map(([label, value]) => ({ البيان: label, القيمة: value }));
  const dataRows = report.rows.map((row) =>
    report.columns.reduce<Record<string, string>>((accumulator, column) => {
      accumulator[column.label] = formatCellValue(row[column.key]);
      return accumulator;
    }, {})
  );

  const metaSheet = XLSX.utils.json_to_sheet([
    { البيان: "عنوان التقرير", القيمة: report.title },
    { البيان: "تاريخ الإنشاء", القيمة: report.generatedAt },
    ...filterRows,
  ]);
  const dataSheet = XLSX.utils.json_to_sheet(dataRows);

  XLSX.utils.book_append_sheet(workbook, metaSheet, "Meta");
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Report");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportElementToPdf = async (element: HTMLElement, fileName: string) => {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const imageData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageWidth = pageWidth - 20;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;

  let remainingHeight = imageHeight;
  let positionY = 10;

  pdf.addImage(imageData, "PNG", 10, positionY, imageWidth, imageHeight, undefined, "FAST");
  remainingHeight -= pageHeight;

  while (remainingHeight > 0) {
    positionY = remainingHeight - imageHeight + 10;
    pdf.addPage();
    pdf.addImage(imageData, "PNG", 10, positionY, imageWidth, imageHeight, undefined, "FAST");
    remainingHeight -= pageHeight;
  }

  pdf.save(`${fileName}.pdf`);
};
