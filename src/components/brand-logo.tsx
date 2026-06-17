import { cn } from "@/lib/utils";

export const APP_NAME = "Maintenance Project";
export const APP_ARABIC_SUBTITLE = "نظام إدارة مركز الصيانة";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo-symbol.png"
      alt={APP_NAME}
      className={cn("h-full w-full object-contain", className)}
    />
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt={`${APP_NAME} - ${APP_ARABIC_SUBTITLE}`}
      className={cn("h-auto w-full object-contain", className)}
    />
  );
}
