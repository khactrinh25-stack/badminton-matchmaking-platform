import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { MyBookingsPage } from './pages/bookings/MyBookingsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { WalletPage } from './pages/wallet/WalletPage';
import { CreateSessionPage } from './pages/sessions/CreateSessionPage';
import { HostManageSessionPage } from './pages/sessions/HostManageSessionPage';
import { SearchSessionsPage } from './pages/sessions/SearchSessionsPage';
import { SessionDetailPage } from './pages/sessions/SessionDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<AppLayout />}>
            <Route path="/sessions" element={<SearchSessionsPage />} />
            <Route path="/sessions/:id" element={<SessionDetailPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/sessions/host" element={<HostManageSessionPage />} />
              <Route path="/sessions/create" element={<CreateSessionPage />} />
              <Route path="/bookings" element={<MyBookingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/wallet" element={<WalletPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/sessions" replace />} />
          <Route path="*" element={<Navigate to="/sessions" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
