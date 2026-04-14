import { Suspense, lazy, type ReactNode } from "react";
import { Authenticated, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import routerProvider, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import {
  BarChart3,
  Calculator,
  ClipboardList,
  DollarSign,
  Home,
  Package,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import "./App.css";
import { Toaster } from "./components/refine-ui/notification/toaster";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { dataProvider } from "./providers/data";
import { authProvider, getStoredUser } from "./providers/auth-provider";
import { canAccessResource, getDefaultRouteForRole } from "./lib/access-control";

const routeDebug = (event: string, payload?: unknown) => {
  if (!import.meta.env.DEV) return;
  console.info(`[routing] ${event}`, payload);
};

const Layout = lazy(() =>
  import("./components/refine-ui/layout/layout").then((module) => ({
    default: module.Layout,
  }))
);
const DashboardPage = lazy(() =>
  import("./pages/dashboard").then((module) => ({ default: module.DashboardPage }))
);
const CasesPage = lazy(() =>
  import("./pages/cases/list").then((module) => ({ default: module.CasesPage }))
);
const CreateCasePage = lazy(() =>
  import("./pages/cases/create").then((module) => ({ default: module.CreateCasePage }))
);
const CaseDetailsPage = lazy(() =>
  import("./pages/cases/show").then((module) => ({ default: module.CaseDetailsPage }))
);
const CustomersPage = lazy(() =>
  import("./pages/customers/list").then((module) => ({ default: module.CustomersPage }))
);
const CustomerDetailsPage = lazy(() =>
  import("./pages/customers/show").then((module) => ({ default: module.CustomerDetailsPage }))
);
const MaintenanceOperationsPage = lazy(() =>
  import("./pages/maintenance-operations/list").then((module) => ({
    default: module.MaintenanceOperationsPage,
  }))
);
const MaintenanceOperationDetailsPage = lazy(() =>
  import("./pages/maintenance-operations/show").then((module) => ({
    default: module.MaintenanceOperationDetailsPage,
  }))
);
const InventoryPage = lazy(() =>
  import("./pages/inventory/list").then((module) => ({ default: module.InventoryPage }))
);
const InventoryDetailsPage = lazy(() =>
  import("./pages/inventory/show").then((module) => ({ default: module.InventoryDetailsPage }))
);
const TeamPage = lazy(() =>
  import("./pages/team/list").then((module) => ({ default: module.TeamPage }))
);
const TeamMemberDetailsPage = lazy(() =>
  import("./pages/team/show").then((module) => ({ default: module.TeamMemberDetailsPage }))
);
const SalesPage = lazy(() =>
  import("./pages/sales/list").then((module) => ({ default: module.SalesPage }))
);
const SalesDetailsPage = lazy(() =>
  import("./pages/sales/show").then((module) => ({ default: module.SalesDetailsPage }))
);
const InvoicePreviewPage = lazy(() =>
  import("./pages/invoices/preview").then((module) => ({ default: module.InvoicePreviewPage }))
);
const ReportsPage = lazy(() =>
  import("./pages/reports/list").then((module) => ({ default: module.ReportsPage }))
);
const AccountingPage = lazy(() =>
  import("./pages/accounting/list").then((module) => ({ default: module.AccountingPage }))
);
const LoginPage = lazy(() =>
  import("./pages/login").then((module) => ({ default: module.LoginPage }))
);
const AcceptInvitationPage = lazy(() =>
  import("./pages/accept-invitation").then((module) => ({ default: module.AcceptInvitationPage }))
);

function RouteFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border bg-card text-sm font-medium text-muted-foreground">
      جاري التحميل...
    </div>
  );
}

function ProtectedRoleRoute({
  resource,
  children,
}: {
  resource: string;
  children: ReactNode;
}) {
  const role = getStoredUser()?.role;

  if (!canAccessResource(role, resource)) {
    routeDebug("blocked-resource", {
      role,
      resource,
      redirectTo: getDefaultRouteForRole(role),
    });
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
  }

  routeDebug("allowed-resource", { role, resource });

  return <>{children}</>;
}

function LoginSuccessRedirect() {
  const role = getStoredUser()?.role;
  const redirectTo = getDefaultRouteForRole(role);

  routeDebug("login-success-redirect", { role, redirectTo });

  return <Navigate to={redirectTo} replace />;
}

function App() {
  const isDev = import.meta.env.DEV;

  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <DevtoolsProvider>
          <Refine
            authProvider={authProvider}
            dataProvider={dataProvider}
            notificationProvider={useNotificationProvider()}
            routerProvider={routerProvider}
            resources={[
              {
                name: "dashboard",
                list: "/",
                meta: {
                  label: "Dashboard",
                  icon: <Home size={16} />,
                  roles: ["admin", "receptionist", "technician", "store_manager", "technician_manager", "maintenance_manager"],
                },
              },
              {
                name: "cases",
                list: "/cases",
                create: "/cases/create",
                show: "/cases/:id",
                meta: {
                  label: "Cases",
                  icon: <ClipboardList size={16} />,
                  roles: ["admin", "receptionist", "store_manager", "technician", "technician_manager", "maintenance_manager"],
                },
              },
              {
                name: "maintenance-operations",
                list: "/maintenance-operations",
                show: "/maintenance-operations/:id",
                meta: {
                  label: "Maintenance Operations",
                  icon: <Wrench size={16} />,
                  roles: ["admin", "receptionist", "technician", "technician_manager", "maintenance_manager"],
                },
              },
              {
                name: "inventory",
                list: "/inventory",
                show: "/inventory/:id",
                meta: {
                  label: "Inventory",
                  icon: <Package size={16} />,
                  roles: ["admin", "store_manager"],
                },
              },
              {
                name: "sales",
                list: "/sales",
                show: "/sales/:id",
                meta: {
                  label: "Sales",
                  icon: <DollarSign size={16} />,
                  roles: ["admin", "receptionist", "store_manager"],
                },
              },
              {
                name: "reports",
                list: "/reports",
                meta: {
                  label: "Reports",
                  icon: <BarChart3 size={16} />,
                  roles: ["admin", "receptionist", "store_manager", "technician_manager", "maintenance_manager"],
                },
              },
              {
                name: "accounting",
                list: "/accounting",
                meta: {
                  label: "Accounting",
                  icon: <Calculator size={16} />,
                  roles: ["admin", "receptionist", "technician_manager", "maintenance_manager"],
                },
              },
              {
                name: "accounting-customers",
                list: "/accounting/customers",
                show: "/accounting/customers/:id",
                meta: {
                  label: "Customers",
                  icon: <UserRound size={16} />,
                  parent: "accounting",
                  roles: ["admin", "receptionist"],
                },
              },
              {
                name: "accounting-team",
                list: "/accounting/team",
                show: "/accounting/team/:id",
                meta: {
                  label: "Team",
                  icon: <Users size={16} />,
                  parent: "accounting",
                  roles: ["admin", "receptionist", "technician_manager", "maintenance_manager"],
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              projectId: "8VaUyH-oJVueN-Hv1pe3",
            }}
          >
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <Authenticated key="login" fallback={<LoginPage />}>
                      <LoginSuccessRedirect />
                    </Authenticated>
                  }
                />
                <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
                <Route path="/invite/:token" element={<AcceptInvitationPage />} />
                <Route
                  path="/invoice-preview/:source/:id"
                  element={
                    <Authenticated key="invoice-preview" redirectOnFail="/login">
                      <ProtectedRoleRoute resource="invoice-preview">
                        <InvoicePreviewPage />
                      </ProtectedRoleRoute>
                    </Authenticated>
                  }
                />
                <Route
                  element={
                    <Authenticated key="protected-routes" redirectOnFail="/login">
                      <Layout />
                    </Authenticated>
                  }
                >
                  <Route index element={<ProtectedRoleRoute resource="dashboard"><DashboardPage /></ProtectedRoleRoute>} />
                  <Route path="cases" element={<ProtectedRoleRoute resource="cases"><CasesPage /></ProtectedRoleRoute>} />
                  <Route path="cases/create" element={<ProtectedRoleRoute resource="cases"><CreateCasePage /></ProtectedRoleRoute>} />
                  <Route path="cases/:id" element={<ProtectedRoleRoute resource="cases"><CaseDetailsPage /></ProtectedRoleRoute>} />
                  <Route
                    path="maintenance-operations"
                    element={<ProtectedRoleRoute resource="maintenance-operations"><MaintenanceOperationsPage /></ProtectedRoleRoute>}
                  />
                  <Route
                    path="maintenance-operations/:id"
                    element={<ProtectedRoleRoute resource="maintenance-operations"><MaintenanceOperationDetailsPage /></ProtectedRoleRoute>}
                  />
                  <Route path="inventory" element={<ProtectedRoleRoute resource="inventory"><InventoryPage /></ProtectedRoleRoute>} />
                  <Route path="inventory/:id" element={<ProtectedRoleRoute resource="inventory"><InventoryDetailsPage /></ProtectedRoleRoute>} />
                  <Route path="sales" element={<ProtectedRoleRoute resource="sales"><SalesPage /></ProtectedRoleRoute>} />
                  <Route path="sales/:id" element={<ProtectedRoleRoute resource="sales"><SalesDetailsPage /></ProtectedRoleRoute>} />
                  <Route path="reports" element={<ProtectedRoleRoute resource="reports"><ReportsPage /></ProtectedRoleRoute>} />
                  <Route path="accounting" element={<ProtectedRoleRoute resource="accounting"><AccountingPage /></ProtectedRoleRoute>} />
                  <Route path="accounting/customers" element={<ProtectedRoleRoute resource="accounting-customers"><CustomersPage /></ProtectedRoleRoute>} />
                  <Route path="accounting/customers/:id" element={<ProtectedRoleRoute resource="accounting-customers"><CustomerDetailsPage /></ProtectedRoleRoute>} />
                  <Route path="accounting/team" element={<ProtectedRoleRoute resource="accounting-team"><TeamPage /></ProtectedRoleRoute>} />
                  <Route path="accounting/team/:id" element={<ProtectedRoleRoute resource="accounting-team"><TeamMemberDetailsPage /></ProtectedRoleRoute>} />
                </Route>
              </Routes>
            </Suspense>

            <Toaster />
            <RefineKbar />
            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
          </Refine>
          {isDev ? <DevtoolsPanel /> : null}
        </DevtoolsProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
