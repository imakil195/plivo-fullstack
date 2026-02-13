import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import AcceptInvitePage from '@/pages/auth/AcceptInvitePage';
import ServicesPage from '@/pages/dashboard/ServicesPage';
import IncidentsPage from '@/pages/dashboard/IncidentsPage';
import IncidentDetailPage from '@/pages/dashboard/IncidentDetailPage';
import MaintenancePage from '@/pages/dashboard/MaintenancePage';
import TeamPage from '@/pages/dashboard/TeamPage';
import StatusPage from '@/pages/public/StatusPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (token) {
    return <Navigate to="/dashboard/services" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      {/* Dashboard routes */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <SocketProvider>
              <DashboardLayout>
                <Routes>
                  <Route path="services" element={<ServicesPage />} />
                  <Route path="incidents" element={<IncidentsPage />} />
                  <Route path="incidents/:id" element={<IncidentDetailPage />} />
                  <Route path="maintenance" element={<MaintenancePage />} />
                  <Route path="team" element={<TeamPage />} />
                  <Route path="*" element={<Navigate to="services" replace />} />
                </Routes>
              </DashboardLayout>
            </SocketProvider>
          </ProtectedRoute>
        }
      />

      {/* Public status page */}
      <Route path="/status/:slug" element={<StatusPage />} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
