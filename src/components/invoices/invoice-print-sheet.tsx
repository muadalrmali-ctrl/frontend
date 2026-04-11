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
      className="w-[794px] bg-white p-10 font-sans text-slate-800"
      dir="rtl"
      style={{ fontFamily: "Tahoma, Arial, sans-serif" }}
    >
      <div className="flex items-start justify-between border-b border-slate-200 pb-8">
        <div className="space-y-2 text-right">
          <h1 className="text-4xl font-bold tracking-tight text-slate-800">شركة الجهاد</h1>
          <p className="text-lg text-slate-500">لاستيراد الأجهزة الكهرومنزلية | جملة وقطاعي</p>
        </div>
        <div className="space-y-3 text-left">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-400">Invoice</p>
          <p className="text-4xl font-semibold text-lime-600">{invoiceCode}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-400">العميل</p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">{customerName}</p>
            {customerPhone ? <p className="mt-1 text-base text-slate-500">{customerPhone}</p> : null}
          </div>
          {caseCode ? (
            <div>
              <p className="text-sm text-slate-400">رقم الحالة</p>
              <p className="mt-1 text-lg font-medium text-slate-700">{caseCode}</p>
            </div>
          ) : null}
          {deviceLabel ? (
            <div>
              <p className="text-sm text-slate-400">الجهاز</p>
              <p className="mt-1 text-lg font-medium text-slate-700">{deviceLabel}</p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <MetaRow label="تاريخ الفاتورة" value={invoiceDate} />
          <MetaRow label="الموظف" value={staffName || "غير محدد"} />
          <MetaRow label="عدد البنود" value={String(items.length)} />
          <MetaRow label="المرجع" value={invoiceCode} />
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full border-collapse text-right">
          <thead className="bg-slate-100 text-sm text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">الوصف</th>
              <th className="px-4 py-3 font-medium">الكمية</th>
              <th className="px-4 py-3 font-medium">سعر الوحدة</th>
              <th className="px-4 py-3 font-medium">الضريبة</th>
              <th className="px-4 py-3 font-medium">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  لا توجد بنود مسجلة في هذه الفاتورة.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                  <td className="px-4 py-4 text-sm font-medium text-slate-700">{item.description}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{item.quantity}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{formatMoney(item.unitPrice)}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{formatMoney(item.tax || 0)}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-700">{formatMoney(item.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex justify-end">
        <div className="w-full max-w-sm space-y-3 rounded-2xl bg-slate-50 p-5">
          <SummaryRow label="الإجمالي الفرعي" value={formatMoney(subtotal)} />
          <SummaryRow label="الخصم" value={formatMoney(discount)} />
          <SummaryRow label="الضريبة" value={formatMoney(tax)} />
          <div className="border-t border-slate-200 pt-3">
            <SummaryRow label="الإجمالي النهائي" value={formatMoney(total)} emphasized />
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800">ملاحظات وشروط</h2>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
            <li>تخضع جميع السلع لشروطنا وأحكامنا.</li>
            <li>الضمان يشمل عيوب التصنيع ولا يشمل سوء الاستخدام أو الحوادث.</li>
            <li>{notes?.trim() || "يرجى الاحتفاظ بالفاتورة للمتابعة وخدمات ما بعد البيع."}</li>
          </ul>
        </div>
        <div className="flex items-end justify-end">
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-8 text-center text-sm text-slate-400">
            شكراً لتعاملكم معنا
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-base font-medium text-slate-700">{value}</p>
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
    <div className="flex items-center justify-between gap-4">
      <span className={emphasized ? "font-semibold text-slate-800" : "text-slate-500"}>{label}</span>
      <span className={emphasized ? "text-lg font-bold text-lime-600" : "font-medium text-slate-700"}>{value}</span>
    </div>
  );
}

export type { InvoicePrintLineItem, InvoicePrintSheetProps };
