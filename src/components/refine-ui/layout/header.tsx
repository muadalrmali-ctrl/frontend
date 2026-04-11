import { UserAvatar } from "@/components/refine-ui/layout/user-avatar";
import { ThemeToggle } from "@/components/refine-ui/theme/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  useActiveAuthProvider,
  useLogout,
  useRefineOptions,
} from "@refinedev/core";
import { Bell, LogOutIcon } from "lucide-react";

export const Header = () => {
  const { isMobile } = useSidebar();

  return <>{isMobile ? <MobileHeader /> : <DesktopHeader />}</>;
};

function DesktopHeader() {
  const { title } = useRefineOptions();

  return (
    <header className="sticky top-0 z-40 mb-3 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-1">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {title.icon}
        </div>
        <div>
          <h2 className="text-base font-black text-foreground">{title.text}</h2>
          <p className="text-xs text-muted-foreground">نظام إدارة مركز الصيانة</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="size-4" />
        </button>
        <ThemeToggle className="h-10 w-10 rounded-xl border border-border bg-card" />
        <UserDropdown />
      </div>
    </header>
  );
}

function MobileHeader() {
  const { open, isMobile } = useSidebar();
  const { title } = useRefineOptions();

  return (
    <header className="sticky top-0 z-40 mb-3 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 px-2">
      <SidebarTrigger
        className={cn("ml-1 rotate-180 rounded-xl border border-border bg-card text-muted-foreground", {
          "opacity-0": open,
          "opacity-100": !open || isMobile,
          "pointer-events-auto": !open || isMobile,
          "pointer-events-none": open && !isMobile,
        })}
      />

      <div className="flex max-w-[calc(100vw-8.5rem)] items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {title.icon}
        </div>
        <h2
          className={cn("text-sm font-black text-foreground transition-opacity duration-150", {
            "opacity-0": !open,
            "opacity-100": open,
          })}
        >
          {title.text}
        </h2>
      </div>

      <ThemeToggle className="h-10 w-10 rounded-xl border border-border bg-card" />
    </header>
  );
}

const UserDropdown = () => {
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const authProvider = useActiveAuthProvider();

  if (!authProvider?.getIdentity) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <UserAvatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => logout()}>
          <LogOutIcon className={cn("text-destructive", "hover:text-destructive")} />
          <span className={cn("text-destructive", "hover:text-destructive")}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

Header.displayName = "Header";
MobileHeader.displayName = "MobileHeader";
DesktopHeader.displayName = "DesktopHeader";
