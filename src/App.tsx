import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { TopNav } from "./components/TopNav";
import { BottomNav } from "./components/BottomNav";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import SignIn from "./pages/SignIn";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <TopNav />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth/sign-in" element={<SignIn />} />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
