import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("ar-LY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";

export const formatMoney = (value?: string | number | null) =>
  `${Number(value || 0).toLocaleString("ar-LY", { maximumFractionDigits: 3 })} د.ل`;

export const formatDateInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function AccountingPageIntro({
  title,
  description,
  backTo,
  backLabel,
}: {
  title: string;
  description: string;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div className="space-y-3">
      {backTo ? (
        <Button variant="ghost" asChild>
          <Link to={backTo}>
            <ArrowRight className="size-4" />
            {backLabel || "العودة"}
          </Link>
        </Button>
      ) : null}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function AccountingField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>;
}
