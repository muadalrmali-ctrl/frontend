import { useList } from "@refinedev/core";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type InventoryItem = {
  id: number;
  name: string;
  code: string;
  brand?: string | null;
  model?: string | null;
  quantity: number;
  minimumStock?: number | null;
  unitCost: string;
  sellingPrice?: string | null;
  location?: string | null;
  isActive: boolean;
};

export function InventoryPage() {
  const { result, query } = useList<InventoryItem>({
    resource: "inventory",
  });

  const items = result.data ?? [];

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Inventory</h1>
        <p className="text-muted-foreground">Spare parts and stock from the backend.</p>
      </div>

      {query.isLoading && <p className="text-muted-foreground">Loading inventory...</p>}
      {query.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {query.error.message}
        </p>
      )}
      {!query.isLoading && !query.error && items.length === 0 && (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          No inventory items found.
        </p>
      )}
      {!query.isLoading && !query.error && items.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.brand ?? "—"}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.minimumStock ?? "—"}</TableCell>
                  <TableCell>{item.unitCost}</TableCell>
                  <TableCell>{item.location ?? "—"}</TableCell>
                  <TableCell>{item.isActive ? "Active" : "Inactive"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
