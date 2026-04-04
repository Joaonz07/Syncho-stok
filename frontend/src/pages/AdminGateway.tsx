import { useEffect } from 'react';

const AdminGateway = () => {
  useEffect(() => {
    window.location.href = `${window.location.origin}/admin/dashboard`;
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 grid place-items-center p-6 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/85 p-8 text-center shadow-[0_30px_80px_-30px_rgba(59,130,246,0.45)] backdrop-blur">
        <h1 className="text-2xl font-black">Area administrativa</h1>
        <p className="mt-3 text-slate-300">Redirecionando para o painel admin...</p>
      </div>
    </main>
  );
};

export default AdminGateway;
