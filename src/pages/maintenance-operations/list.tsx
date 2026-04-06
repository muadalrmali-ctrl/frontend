export function MaintenanceOperationsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Maintenance Operations</h1>
      <p className="text-muted-foreground">
        Maintenance operations are case-based. This page will use services,
        parts, and invoice calls once the case workflow UI is built.
      </p>
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Available backend calls: case services, case parts, and case invoice
        creation under /api/cases/:caseId.
      </div>
    </section>
  );
}
