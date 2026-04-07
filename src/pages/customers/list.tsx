import { useList } from "@refinedev/core";
import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Customer = {
  id: number;
  name: string;
  phone: string;
  address?: string | null;
  notes?: string | null;
  createdAt?: string | null;
};

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("ar-LY").format(new Date(value)) : "-";

export function CustomersPage() {
  const { result, query } = useList<Customer>({ resource: "customers" });
  const customers = result.data ?? [];

  return (
    <section className="space-y-4" dir="rtl">
      <div>
        <h1 className="text-3xl font-semibold">العملاء</h1>
        <p className="text-muted-foreground">سجل العملاء وتاريخ الصيانة والفواتير.</p>
      </div>

      {query.isLoading && <p className="text-muted-foreground">جاري تحميل العملاء...</p>}
      {query.error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{query.error.message}</p>}
      {!query.isLoading && !query.error && customers.length === 0 && <p className="rounded-lg border p-4 text-sm text-muted-foreground">لا يوجد عملاء.</p>}
      {!query.isLoading && !query.error && customers.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>العنوان</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium"><Link to={`/accounting/customers/${customer.id}`}>{customer.name}</Link></TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.address ?? "-"}</TableCell>
                  <TableCell>{formatDate(customer.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
