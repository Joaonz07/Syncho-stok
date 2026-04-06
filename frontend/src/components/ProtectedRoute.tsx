import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type ProtectedRouteProps = {
  children: ReactNode;
  requireRole?: 'ADMIN' | 'DEV' | 'CLIENT';
};

const ProtectedRoute = ({ children, requireRole }: ProtectedRouteProps) => {
  const location = useLocation();
  const { loading, isAuthenticated, role } = useAuth();

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 grid place-items-center p-6 text-slate-100">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 text-sm text-slate-300">
          Validando sessao...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireRole === 'ADMIN' && role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireRole === 'CLIENT' && role !== 'CLIENT') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireRole === 'DEV' && role !== 'DEV') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
