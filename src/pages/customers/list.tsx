import { useList } from "@refinedev/core";
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
  value ? new Intl.DateTimeFormat("en-US").format(new Date(value)) : "—";

export function CustomersPage() {
  const { result, query } = useList<Customer>({
    resource: "customers",
  });

  const customers = result.data ?? [];

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Customers</h1>
        <p className="text-muted-foreground">Customer records from the backend.</p>
      </div>

      {query.isLoading && <p className="text-muted-foreground">Loading customers...</p>}
      {query.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {query.error.message}
        </p>
      )}
      {!query.isLoading && !query.error && customers.length === 0 && (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          No customers found.
        </p>
      )}
      {!query.isLoading && !query.error && customers.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.address ?? "—"}</TableCell>
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
