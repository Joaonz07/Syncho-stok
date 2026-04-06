import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PDVPage = lazy(() => import('./pages/PDVPage'));

const RouteLoader = () => (
  <main className="saas-page grid place-items-center p-6 text-slate-100">
    <div className="saas-shell max-w-sm px-5 py-4 text-sm text-slate-300">
      Carregando pagina...
    </div>
  </main>
);

function RootRedirect() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <main className="saas-page grid place-items-center p-6 text-slate-100">
        <div className="saas-shell max-w-sm px-5 py-4 text-sm text-slate-300">
          Carregando CRM...
        </div>
      </main>
    );
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function App() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pdv"
          element={
            <ProtectedRoute>
              <PDVPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
}

export default App;
