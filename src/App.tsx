import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import Users from "./pages/Users";
import UserDetail from "./pages/UserDetail";
import Workflows from "./pages/Workflows";
import WorkflowDetail from "./pages/WorkflowDetail";
import Runs from "./pages/Runs";
import RunDetail from "./pages/RunDetail";
import MyTasks from "./pages/MyTasks";
import EmployeeFieldsSettings from "./pages/EmployeeFieldsSettings";
import SignIn from "./pages/SignIn";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <AppShell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth/sign-in" element={<SignIn />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
                <Route
                  path="/app/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/employees"
                  element={
                    <ProtectedRoute>
                      <Employees />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/employees/:id"
                  element={
                    <ProtectedRoute>
                      <EmployeeDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/users"
                  element={
                    <ProtectedRoute>
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/users/:id"
                  element={
                    <ProtectedRoute>
                      <UserDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/workflows"
                  element={
                    <ProtectedRoute>
                      <Workflows />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/workflows/:id"
                  element={
                    <ProtectedRoute>
                      <WorkflowDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/runs"
                  element={
                    <ProtectedRoute>
                      <Runs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/runs/:id"
                  element={
                    <ProtectedRoute>
                      <RunDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/my-tasks"
                  element={
                    <ProtectedRoute>
                      <MyTasks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/settings/employee-fields"
                  element={
                    <ProtectedRoute>
                      <EmployeeFieldsSettings />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppShell>
          </AuthProvider>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
