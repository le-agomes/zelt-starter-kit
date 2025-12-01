import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OnboardingGuard } from "./components/OnboardingGuard";
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
import FormTemplates from "./pages/FormTemplates";
import FormBuilder from "./pages/FormBuilder";
import MyRequests from "./pages/MyRequests";
import Chat from "./pages/Chat";
import OnboardingWizard from "./pages/OnboardingWizard";
import SignIn from "./pages/SignIn";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";

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
                <Route path="/app/onboarding" element={<ProtectedRoute><OnboardingGuard><OnboardingWizard /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/dashboard" element={<ProtectedRoute><OnboardingGuard><Dashboard /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/employees" element={<ProtectedRoute><OnboardingGuard><Employees /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/employees/:id" element={<ProtectedRoute><OnboardingGuard><EmployeeDetail /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/users" element={<ProtectedRoute><OnboardingGuard><Users /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/users/:id" element={<ProtectedRoute><OnboardingGuard><UserDetail /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/workflows" element={<ProtectedRoute><OnboardingGuard><Workflows /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/workflows/:id" element={<ProtectedRoute><OnboardingGuard><WorkflowDetail /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/runs" element={<ProtectedRoute><OnboardingGuard><Runs /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/runs/:id" element={<ProtectedRoute><OnboardingGuard><RunDetail /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/my-tasks" element={<ProtectedRoute><OnboardingGuard><MyTasks /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/chat" element={<ProtectedRoute><OnboardingGuard><Chat /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/chat/:conversationId" element={<ProtectedRoute><OnboardingGuard><Chat /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/settings" element={<ProtectedRoute><OnboardingGuard><Settings /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/forms/templates/new" element={<ProtectedRoute><OnboardingGuard><FormBuilder /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/forms/templates/:id/edit" element={<ProtectedRoute><OnboardingGuard><FormBuilder /></OnboardingGuard></ProtectedRoute>} />
                <Route path="/app/my-requests" element={<ProtectedRoute><OnboardingGuard><MyRequests /></OnboardingGuard></ProtectedRoute>} />
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
