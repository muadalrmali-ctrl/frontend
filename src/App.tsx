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
  Cpu,
  DollarSign,
  Home,
  Inbox,
  MapPin,
  Package,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import "./App.css";
import { Toaster } from "./components/refine-ui/notification/toaster";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { APP_NAME, BrandMark } from "./components/brand-logo";
import { dataProvider } from "./providers/data";
import { authProvider, getStoredUser } from "./providers/auth-provider";
import { canAccessResource, getDefaultRouteForUser, hasAnyPermission } from "./lib/access-control";

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
const ReceptionPointsPage = lazy(() =>
  import("./pages/reception-points/list").then((module) => ({ default: module.ReceptionPointsPage }))
);
const ReceptionPointDetailsPage = lazy(() =>
  import("./pages/reception-points/show").then((module) => ({ default: module.ReceptionPointDetailsPage }))
);
const IncomingReceptionCasesPage = lazy(() =>
  import("./pages/incoming-reception-cases/list").then((module) => ({ default: module.IncomingReceptionCasesPage }))
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
const AccountingDevicesPage = lazy(() =>
  import("./pages/accounting/devices/list").then((module) => ({ default: module.AccountingDevicesPage }))
);
const AccountingDeviceDetailsPage = lazy(() =>
  import("./pages/accounting/devices/show").then((module) => ({ default: module.AccountingDeviceDetailsPage }))
);
const AccountingDeviceCreatePage = lazy(() =>
  import("./pages/accounting/devices/create").then((module) => ({ default: module.AccountingDeviceCreatePage }))
);
const AccountingDeviceEditPage = lazy(() =>
  import("./pages/accounting/devices/edit").then((module) => ({ default: module.AccountingDeviceEditPage }))
);
const LoginPage = lazy(() =>
  import("./pages/login").then((module) => ({ default: module.LoginPage }))
);
const ResetPasswordPage = lazy(() =>
  import("./pages/reset-password").then((module) => ({ default: module.ResetPasswordPage }))
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

function ProtectedAccessRoute({
  resource,
  requiredPermissions,
  children,
}: {
  resource: string;
  requiredPermissions?: string[];
  children: ReactNode;
}) {
  const user = getStoredUser();

  if (!canAccessResource(user, resource) || (requiredPermissions?.length && !hasAnyPermission(user, requiredPermissions))) {
    routeDebug("blocked-resource", {
      user,
      resource,
      requiredPermissions,
      redirectTo: getDefaultRouteForUser(user),
    });
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  routeDebug("allowed-resource", { user, resource, requiredPermissions });

  return <>{children}</>;
}

function LoginSuccessRedirect() {
  const user = getStoredUser();
  const redirectTo = getDefaultRouteForUser(user);

  routeDebug("login-success-redirect", { user, redirectTo });

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
                  label: "لوحة التحكم",
                  icon: <Home size={16} />,
                  roles: ["admin", "receptionist", "technician", "store_manager", "technician_manager", "maintenance_manager", "reception_point_user"],
                },
              },
              {
                name: "cases",
                list: "/cases",
                create: "/cases/create",
                show: "/cases/:id",
                meta: {
                  label: "الحالات",
                  icon: <ClipboardList size={16} />,
                  roles: ["admin", "receptionist", "store_manager", "technician", "technician_manager", "maintenance_manager", "reception_point_user"],
                },
              },
              {
                name: "incoming-reception-cases",
                list: "/incoming-reception-cases",
                meta: {
                  label: "استلام نقاط الاستلام",
                  icon: <Inbox size={16} />,
                  roles: ["admin", "receptionist", "maintenance_manager", "reception_point_user"],
                },
              },
              {
                name: "maintenance-operations",
                list: "/maintenance-operations",
                show: "/maintenance-operations/:id",
                meta: {
                  label: "عمليات الصيانة",
                  icon: <Wrench size={16} />,
                  roles: ["admin", "receptionist", "technician", "technician_manager", "maintenance_manager", "reception_point_user"],
                },
              },
              {
                name: "inventory",
                list: "/inventory",
                show: "/inventory/:id",
                meta: {
                  label: "المخزون",
                  icon: <Package size={16} />,
                  roles: ["admin", "store_manager"],
                },
              },
              {
                name: "sales",
                list: "/sales",
                show: "/sales/:id",
                meta: {
                  label: "المبيعات",
                  icon: <DollarSign size={16} />,
                  roles: ["admin", "receptionist", "store_manager"],
                },
              },
              {
                name: "reports",
                list: "/reports",
                meta: {
                  label: "التقارير",
                  icon: <BarChart3 size={16} />,
                  roles: ["admin", "receptionist", "store_manager", "technician_manager", "maintenance_manager"],
                },
              },
              {
                name: "accounting",
                list: "/accounting",
                meta: {
                  label: "المحاسبة",
                  icon: <Calculator size={16} />,
                  roles: ["admin", "receptionist", "technician_manager", "maintenance_manager"],
                },
              },
              {
                name: "accounting-customers",
                list: "/accounting/customers",
                show: "/accounting/customers/:id",
                meta: {
                  label: "العملاء",
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
                  label: "الفريق",
                  icon: <Users size={16} />,
                  parent: "accounting",
                  roles: ["admin", "receptionist", "technician_manager", "maintenance_manager"],
                },
              },
              {
                name: "accounting-devices",
                list: "/accounting/devices",
                create: "/accounting/devices/create",
                show: "/accounting/devices/:id",
                edit: "/accounting/devices/:id/edit",
                meta: {
                  label: "الأجهزة",
                  icon: <Cpu size={16} />,
                  parent: "accounting",
                  roles: ["admin", "receptionist", "technician_manager", "maintenance_manager"],
                },
              },
              {
                name: "reception-points",
                list: "/accounting/reception-points",
                show: "/accounting/reception-points/:id",
                meta: {
                  label: "نقاط الاستلام",
                  icon: <MapPin size={16} />,
                  parent: "accounting",
                  roles: ["admin", "receptionist", "maintenance_manager"],
                },
              },
            ]}
            options={{
              title: {
                text: APP_NAME,
                icon: <BrandMark />,
              },
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
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
                <Route path="/invite/:token" element={<AcceptInvitationPage />} />
                <Route
                  path="/invoice-preview/:source/:id"
                  element={
                    <Authenticated key="invoice-preview" redirectOnFail="/login">
                      <ProtectedAccessRoute resource="invoice-preview">
                        <InvoicePreviewPage />
                      </ProtectedAccessRoute>
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
                  <Route index element={<ProtectedAccessRoute resource="dashboard"><DashboardPage /></ProtectedAccessRoute>} />
                  <Route path="cases" element={<ProtectedAccessRoute resource="cases"><CasesPage /></ProtectedAccessRoute>} />
                  <Route path="cases/create" element={<ProtectedAccessRoute resource="cases" requiredPermissions={["cases.create"]}><CreateCasePage /></ProtectedAccessRoute>} />
                  <Route path="cases/:id" element={<ProtectedAccessRoute resource="cases"><CaseDetailsPage /></ProtectedAccessRoute>} />
                  <Route path="incoming-reception-cases" element={<ProtectedAccessRoute resource="incoming-reception-cases"><IncomingReceptionCasesPage /></ProtectedAccessRoute>} />
                  <Route
                    path="maintenance-operations"
                    element={<ProtectedAccessRoute resource="maintenance-operations"><MaintenanceOperationsPage /></ProtectedAccessRoute>}
                  />
                  <Route
                    path="maintenance-operations/:id"
                    element={<ProtectedAccessRoute resource="maintenance-operations"><MaintenanceOperationDetailsPage /></ProtectedAccessRoute>}
                  />
                  <Route path="inventory" element={<ProtectedAccessRoute resource="inventory"><InventoryPage /></ProtectedAccessRoute>} />
                  <Route path="inventory/:id" element={<ProtectedAccessRoute resource="inventory"><InventoryDetailsPage /></ProtectedAccessRoute>} />
                  <Route path="sales" element={<ProtectedAccessRoute resource="sales"><SalesPage /></ProtectedAccessRoute>} />
                  <Route path="sales/:id" element={<ProtectedAccessRoute resource="sales"><SalesDetailsPage /></ProtectedAccessRoute>} />
                  <Route path="reports" element={<ProtectedAccessRoute resource="reports"><ReportsPage /></ProtectedAccessRoute>} />
                  <Route path="accounting" element={<ProtectedAccessRoute resource="accounting"><AccountingPage /></ProtectedAccessRoute>} />
                  <Route path="accounting/customers" element={<ProtectedAccessRoute resource="accounting-customers"><CustomersPage /></ProtectedAccessRoute>} />
                  <Route path="accounting/customers/:id" element={<ProtectedAccessRoute resource="accounting-customers"><CustomerDetailsPage /></ProtectedAccessRoute>} />
                  <Route path="accounting/team" element={<ProtectedAccessRoute resource="accounting-team"><TeamPage /></ProtectedAccessRoute>} />
                  <Route path="accounting/team/:id" element={<ProtectedAccessRoute resource="accounting-team"><TeamMemberDetailsPage /></ProtectedAccessRoute>} />
                  <Route path="accounting/devices" element={<ProtectedAccessRoute resource="accounting-devices"><AccountingDevicesPage /></ProtectedAccessRoute>} />
                  <Route path="accounting/devices/create" element={<ProtectedAccessRoute resource="accounting-devices" requiredPermissions={["accounting.devices.manage"]}><AccountingDeviceCreatePage /></ProtectedAccessRoute>} />
                  <Route path="accounting/devices/:id" element={<ProtectedAccessRoute resource="accounting-devices"><AccountingDeviceDetailsPage /></ProtectedAccessRoute>} />
                  <Route path="accounting/devices/:id/edit" element={<ProtectedAccessRoute resource="accounting-devices" requiredPermissions={["accounting.devices.manage"]}><AccountingDeviceEditPage /></ProtectedAccessRoute>} />
                  <Route path="accounting/reception-points" element={<ProtectedAccessRoute resource="reception-points"><ReceptionPointsPage /></ProtectedAccessRoute>} />
                  <Route path="accounting/reception-points/:id" element={<ProtectedAccessRoute resource="reception-points"><ReceptionPointDetailsPage /></ProtectedAccessRoute>} />
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
