import { Authenticated, GitHubBanner, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import routerProvider, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Route, Routes } from "react-router";
import { Home, ClipboardList, Wrench, Package, Users, DollarSign, BarChart3, Calculator, UserRound } from "lucide-react";
import "./App.css";
import { Toaster } from "./components/refine-ui/notification/toaster";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider";
import { dataProvider } from "./providers/data";
import { authProvider } from "./providers/auth-provider";
import { Layout } from "./components/refine-ui/layout/layout";
import { DashboardPage } from "./pages/dashboard";
import { CasesPage } from "./pages/cases/list";
import { CreateCasePage } from "./pages/cases/create";
import { CaseDetailsPage } from "./pages/cases/show";
import { CustomersPage } from "./pages/customers/list";
import { CustomerDetailsPage } from "./pages/customers/show";
import { MaintenanceOperationsPage } from "./pages/maintenance-operations/list";
import { MaintenanceOperationDetailsPage } from "./pages/maintenance-operations/show";
import { InventoryPage } from "./pages/inventory/list";
import { InventoryDetailsPage } from "./pages/inventory/show";
import { TeamPage } from "./pages/team/list";
import { SalesPage } from "./pages/sales/list";
import { SalesDetailsPage } from "./pages/sales/show";
import { ReportsPage } from "./pages/reports/list";
import { AccountingPage } from "./pages/accounting/list";
import { LoginPage } from "./pages/login";
import { AcceptInvitationPage } from "./pages/accept-invitation";

function App() {
  return (
    <BrowserRouter>
      <GitHubBanner />
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
                },
              },
              {
                name: "maintenance-operations",
                list: "/maintenance-operations",
                show: "/maintenance-operations/:id",
                meta: {
                  label: "Maintenance Operations",
                  icon: <Wrench size={16} />,
                },
              },
              {
                name: "inventory",
                list: "/inventory",
                show: "/inventory/:id",
                meta: {
                  label: "Inventory",
                  icon: <Package size={16} />,
                },
              },
              {
                name: "sales",
                list: "/sales",
                show: "/sales/:id",
                meta: {
                  label: "Sales",
                  icon: <DollarSign size={16} />,
                },
              },
              {
                name: "reports",
                list: "/reports",
                meta: {
                  label: "Reports",
                  icon: <BarChart3 size={16} />,
                },
              },
              {
                name: "accounting",
                list: "/accounting",
                meta: {
                  label: "Accounting",
                  icon: <Calculator size={16} />,
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
                },
              },
              {
                name: "accounting-team",
                list: "/accounting/team",
                meta: {
                  label: "Team",
                  icon: <Users size={16} />,
                  parent: "accounting",
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              projectId: "8VaUyH-oJVueN-Hv1pe3",
            }}
          >
            <Routes>
              <Route
                path="/login"
                element={
                  <Authenticated key="login" fallback={<LoginPage />}>
                    <NavigateToResource resource="dashboard" />
                  </Authenticated>
                }
              />
              <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
              <Route
                element={
                  <Authenticated key="protected-routes" redirectOnFail="/login">
                    <Layout />
                  </Authenticated>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="cases" element={<CasesPage />} />
                <Route path="cases/create" element={<CreateCasePage />} />
                <Route path="cases/:id" element={<CaseDetailsPage />} />
                <Route
                  path="maintenance-operations"
                  element={<MaintenanceOperationsPage />}
                />
                <Route
                  path="maintenance-operations/:id"
                  element={<MaintenanceOperationDetailsPage />}
                />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="inventory/:id" element={<InventoryDetailsPage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="sales/:id" element={<SalesDetailsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="accounting" element={<AccountingPage />} />
                <Route path="accounting/customers" element={<CustomersPage />} />
                <Route path="accounting/customers/:id" element={<CustomerDetailsPage />} />
                <Route path="accounting/team" element={<TeamPage />} />
              </Route>
            </Routes>

            <Toaster />
            <RefineKbar />
            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
          </Refine>
          <DevtoolsPanel />
        </DevtoolsProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
