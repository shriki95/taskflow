import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ProjectPage from './pages/ProjectPage';

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-app-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/signup"   element={<PublicRoute><SignupPage /></PublicRoute>} />
            <Route path="/"         element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"
              element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
            />
            <Route path="/projects/:projectId"
              element={<ProtectedRoute><ProjectPage /></ProtectedRoute>}
            />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
