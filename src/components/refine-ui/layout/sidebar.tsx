"use client";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent as ShadcnSidebarContent,
  SidebarHeader as ShadcnSidebarHeader,
  SidebarRail as ShadcnSidebarRail,
  SidebarTrigger as ShadcnSidebarTrigger,
  useSidebar as useShadcnSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  useLink,
  useMenu,
  useRefineOptions,
  type TreeMenuItem,
} from "@refinedev/core";
import { ChevronRight, ListIcon } from "lucide-react";
import React from "react";

export function Sidebar() {
  const { open } = useShadcnSidebar();
  const { menuItems, selectedKey } = useMenu();

  return (
    <ShadcnSidebar collapsible="icon" className={cn("border-none bg-sidebar")}>
      <ShadcnSidebarRail />
      <SidebarHeader />
      <ShadcnSidebarContent
        className={cn(
          "flex flex-col gap-2 border-e border-sidebar-border bg-sidebar pt-3 pb-3",
          {
            "px-3": open,
            "px-2": !open,
          }
        )}
      >
        {menuItems.map((item: TreeMenuItem) => (
          <SidebarItem
            key={item.key || item.name}
            item={item}
            selectedKey={selectedKey}
          />
        ))}
      </ShadcnSidebarContent>
    </ShadcnSidebar>
  );
}

type MenuItemProps = {
  item: TreeMenuItem;
  selectedKey?: string;
};

function SidebarItem({ item, selectedKey }: MenuItemProps) {
  const { open } = useShadcnSidebar();

  if (item.meta?.group) {
    return <SidebarItemGroup item={item} selectedKey={selectedKey} />;
  }

  if (item.children && item.children.length > 0) {
    if (open) {
      return <SidebarItemCollapsible item={item} selectedKey={selectedKey} />;
    }
    return <SidebarItemDropdown item={item} selectedKey={selectedKey} />;
  }

  return <SidebarItemLink item={item} selectedKey={selectedKey} />;
}

function SidebarItemGroup({ item, selectedKey }: MenuItemProps) {
  const { children } = item;
  const { open } = useShadcnSidebar();

  return (
    <div className={cn("border-t border-sidebar-border pt-4")}>
      <span
        className={cn(
          "ml-3 block text-xs font-bold uppercase text-muted-foreground transition-all duration-150",
          {
            "h-8": open,
            "h-0 opacity-0 pointer-events-none": !open,
          }
        )}
      >
        {getDisplayName(item)}
      </span>
      {children && children.length > 0 && (
        <div className={cn("flex flex-col")}>
          {children.map((child: TreeMenuItem) => (
            <SidebarItem
              key={child.key || child.name}
              item={child}
              selectedKey={selectedKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarItemCollapsible({ item, selectedKey }: MenuItemProps) {
  const { name, children } = item;

  const chevronIcon = (
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-90" />
  );

  return (
    <Collapsible key={`collapsible-${name}`} className={cn("group w-full")}>
      <CollapsibleTrigger asChild>
        <SidebarButton item={item} rightIcon={chevronIcon} />
      </CollapsibleTrigger>
      <CollapsibleContent className={cn("ml-5 flex flex-col gap-2")}>
        {children?.map((child: TreeMenuItem) => (
          <SidebarItem
            key={child.key || child.name}
            item={child}
            selectedKey={selectedKey}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function SidebarItemDropdown({ item, selectedKey }: MenuItemProps) {
  const { children } = item;
  const Link = useLink();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarButton item={item} />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        {children?.map((child: TreeMenuItem) => {
          const { key: childKey } = child;
          const isSelected = childKey === selectedKey;

          return (
            <DropdownMenuItem key={childKey || child.name} asChild>
              <Link
                to={child.route || ""}
                className={cn("flex w-full items-center gap-2", {
                  "bg-accent text-accent-foreground": isSelected,
                })}
              >
                <ItemIcon icon={child.meta?.icon ?? child.icon} />
                <span>{getDisplayName(child)}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarItemLink({ item, selectedKey }: MenuItemProps) {
  const isSelected = item.key === selectedKey;
  return <SidebarButton item={item} isSelected={isSelected} asLink />;
}

function SidebarHeader() {
  const { title } = useRefineOptions();
  const { open, isMobile } = useShadcnSidebar();

  return (
    <ShadcnSidebarHeader className="h-18 flex-row items-center justify-between border-e border-sidebar-border bg-sidebar p-3">
      <div
        className={cn("flex h-12 flex-row items-center justify-start gap-2 overflow-hidden px-2", {
          "w-[calc(100%-3.2rem)]": open,
          "w-[3.2rem]": !open,
        })}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
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

      <ShadcnSidebarTrigger
        className={cn("mr-1.5 rounded-xl border border-border bg-card text-muted-foreground", {
          "opacity-0": !open,
          "opacity-100 pointer-events-auto": open || isMobile,
          "pointer-events-none": !open && !isMobile,
        })}
      />
    </ShadcnSidebarHeader>
  );
}

function getDisplayName(item: TreeMenuItem) {
  return item.meta?.label ?? item.label ?? item.name;
}

type IconProps = {
  icon: React.ReactNode;
};

function ItemIcon({ icon }: IconProps) {
  return (
    <div className="flex h-5 w-5 items-center justify-center text-current opacity-80">
      {icon ?? <ListIcon className="size-4" />}
    </div>
  );
}

type SidebarButtonProps = React.ComponentProps<typeof Button> & {
  item: TreeMenuItem;
  isSelected?: boolean;
  rightIcon?: React.ReactNode;
  asLink?: boolean;
  onClick?: () => void;
};

function SidebarButton({
  item,
  isSelected = false,
  rightIcon,
  asLink = false,
  className,
  onClick,
  ...props
}: SidebarButtonProps) {
  const Link = useLink();

  const buttonContent = (
    <>
      <ItemIcon icon={item.meta?.icon ?? item.icon} />
      <span
        className={cn("tracking-[-0.00875rem]", {
          "flex-1 text-left": rightIcon,
          "line-clamp-1 truncate": !rightIcon,
          "font-medium": !isSelected,
          "font-bold": isSelected,
        })}
      >
        {getDisplayName(item)}
      </span>
      {rightIcon}
    </>
  );

  return (
    <Button
      asChild={!!(asLink && item.route)}
      variant="ghost"
      size="lg"
      className={cn(
        "flex h-auto w-full items-center justify-start gap-3 rounded-xl py-2.5 !px-3 text-sm text-sidebar-foreground",
        {
          "border border-primary/12 bg-primary/8 text-primary": isSelected,
          "hover:!bg-sidebar-accent": !isSelected,
        },
        className
      )}
      onClick={onClick}
      {...props}
    >
      {asLink && item.route ? (
        <Link to={item.route} className={cn("flex w-full items-center gap-2")}>
          {buttonContent}
        </Link>
      ) : (
        buttonContent
      )}
    </Button>
  );
}

Sidebar.displayName = "Sidebar";
