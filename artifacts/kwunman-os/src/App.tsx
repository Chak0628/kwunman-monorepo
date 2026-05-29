import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";

import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import NewQuote from "@/pages/new-quote";
import Clients from "@/pages/clients";
import Expenses from "@/pages/expenses";
import NewExpense from "@/pages/new-expense";
import Profit from "@/pages/profit";
import CashFlow from "@/pages/cashflow";
import Payroll from "@/pages/payroll";
import PayslipsAdmin from "@/pages/payslips-admin";
import EmployeeAccounts from "@/pages/employee-accounts";
import Settings from "@/pages/settings";
import Schedule from "@/pages/schedule";
import EmployeePayslips from "@/pages/payslips-employee";
import LoginPage from "@/pages/login";
import Documents from "@/pages/documents";
import ChemForms from "@/pages/chem-forms";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  const { user, loading, isEmployee } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg mx-auto">KM</div>
          <p className="text-sm text-muted-foreground">系統載入中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (isEmployee) {
    return (
      <AppLayout>
        <Switch>
          <Route path="/" component={Schedule} />
          <Route path="/schedule" component={Schedule} />
          <Route path="/payslips" component={EmployeePayslips} />
          <Route path="/chem-forms" component={ChemForms} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/projects" component={Projects} />
        <Route path="/new-quote" component={NewQuote} />
        <Route path="/clients" component={Clients} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/new-expense" component={NewExpense} />
        <Route path="/profit" component={Profit} />
        <Route path="/cashflow" component={CashFlow} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/payroll" component={Payroll} />
        <Route path="/payslips-admin" component={PayslipsAdmin} />
        <Route path="/users" component={EmployeeAccounts} />
        <Route path="/settings" component={Settings} />
        <Route path="/documents" component={Documents} />
        <Route path="/chem-forms" component={ChemForms} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
