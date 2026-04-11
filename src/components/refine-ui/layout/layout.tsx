"use client";

import { Header } from "@/components/refine-ui/layout/header";
import { ThemeProvider } from "@/components/refine-ui/theme/theme-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";

export function Layout() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <Sidebar />
        <SidebarInset>
          <Header />
          <main
            className={cn(
              "@container/main",
              "relative",
              "w-full",
              "flex",
              "flex-col",
              "flex-1",
              "overflow-hidden",
              "px-3",
              "pb-8",
              "pt-5",
              "md:px-5",
              "md:pt-6",
              "lg:px-7",
              "lg:pt-7"
            )}
          >
            <div className="app-grid absolute inset-x-0 top-0 -z-10 h-80 rounded-[2.5rem] opacity-50" />
            <div className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}

Layout.displayName = "Layout";
