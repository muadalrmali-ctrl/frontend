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
import { Bell, LogOutIcon, Sparkles } from "lucide-react";

export const Header = () => {
  const { isMobile } = useSidebar();

  return <>{isMobile ? <MobileHeader /> : <DesktopHeader />}</>;
};

function DesktopHeader() {
  const { title } = useRefineOptions();

  return (
    <header
      className={cn(
        "sticky",
        "top-0",
        "flex",
        "h-20",
        "shrink-0",
        "items-center",
        "gap-4",
        "justify-between",
        "z-40"
      )}
    >
      <div className="glass-panel flex items-center gap-3 rounded-[1.7rem] px-4 py-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          {title.icon}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/70">
            Maintenance Center
          </p>
          <h2 className="text-lg font-black text-foreground">{title.text}</h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="glass-panel hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground lg:flex">
          <Sparkles className="size-4 text-violet-500" />
          واجهة تشغيل أكثر حيوية ووضوحًا
        </div>
        <button
          type="button"
          className="glass-panel inline-flex h-12 w-12 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="size-5" />
        </button>
        <ThemeToggle />
        <UserDropdown />
      </div>
    </header>
  );
}

function MobileHeader() {
  const { open, isMobile } = useSidebar();

  const { title } = useRefineOptions();

  return (
    <header
      className={cn(
        "sticky",
        "top-0",
        "flex",
        "h-16",
        "shrink-0",
        "items-center",
        "gap-2",
        "px-2",
        "justify-between",
        "z-40"
      )}
    >
      <SidebarTrigger
        className={cn("glass-panel text-muted-foreground rotate-180 rounded-2xl", "ml-1", {
          "opacity-0": open,
          "opacity-100": !open || isMobile,
          "pointer-events-auto": !open || isMobile,
          "pointer-events-none": open && !isMobile,
        })}
      />

      <div
        className={cn(
          "glass-panel whitespace-nowrap",
          "flex",
          "flex-row",
          "h-12",
          "items-center",
          "justify-start",
          "gap-2",
          "rounded-[1.35rem]",
          "px-3",
          "transition-discrete",
          "duration-200",
          "max-w-[calc(100vw-8.5rem)]"
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          {title.icon}
        </div>
        <h2
          className={cn(
            "text-sm font-black",
            "transition-opacity",
            "duration-200",
            {
              "opacity-0": !open,
              "opacity-100": open,
            }
          )}
        >
          {title.text}
        </h2>
      </div>

      <ThemeToggle className={cn("glass-panel h-10 w-10 rounded-2xl")} />
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
        <DropdownMenuItem
          onClick={() => {
            logout();
          }}
        >
          <LogOutIcon
            className={cn("text-destructive", "hover:text-destructive")}
          />
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
