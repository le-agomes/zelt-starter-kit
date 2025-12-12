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
            <Routes>
              {/* Public routes - no AppShell */}
              <Route path="/" element={<Home />} />
              <Route path="/auth/sign-in" element={<SignIn />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Protected routes - wrapped in AppShell */}
              <Route path="/app/*" element={
                <ProtectedRoute>
                  <AppShell>
                    <Routes>
                      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
                      <Route path="/onboarding" element={<OnboardingGuard><OnboardingWizard /></OnboardingGuard>} />
                      <Route path="/dashboard" element={<OnboardingGuard><Dashboard /></OnboardingGuard>} />
                      <Route path="/employees" element={<OnboardingGuard><Employees /></OnboardingGuard>} />
                      <Route path="/employees/:id" element={<OnboardingGuard><EmployeeDetail /></OnboardingGuard>} />
                      <Route path="/users" element={<OnboardingGuard><Users /></OnboardingGuard>} />
                      <Route path="/users/:id" element={<OnboardingGuard><UserDetail /></OnboardingGuard>} />
                      <Route path="/workflows" element={<OnboardingGuard><Workflows /></OnboardingGuard>} />
                      <Route path="/workflows/:id" element={<OnboardingGuard><WorkflowDetail /></OnboardingGuard>} />
                      <Route path="/runs" element={<OnboardingGuard><Runs /></OnboardingGuard>} />
                      <Route path="/runs/:id" element={<OnboardingGuard><RunDetail /></OnboardingGuard>} />
                      <Route path="/my-tasks" element={<OnboardingGuard><MyTasks /></OnboardingGuard>} />
                      <Route path="/chat" element={<OnboardingGuard><Chat /></OnboardingGuard>} />
                      <Route path="/chat/:conversationId" element={<OnboardingGuard><Chat /></OnboardingGuard>} />
                      <Route path="/settings" element={<OnboardingGuard><Settings /></OnboardingGuard>} />
                      <Route path="/forms/templates/new" element={<OnboardingGuard><FormBuilder /></OnboardingGuard>} />
                      <Route path="/forms/templates/:id/edit" element={<OnboardingGuard><FormBuilder /></OnboardingGuard>} />
                      <Route path="/my-requests" element={<OnboardingGuard><MyRequests /></OnboardingGuard>} />
                    </Routes>
                  </AppShell>
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
