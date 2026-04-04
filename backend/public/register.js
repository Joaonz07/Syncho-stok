const form = document.getElementById('register-form');
const statusEl = document.getElementById('register-status');
const registerBtn = document.getElementById('register-btn');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    name: document.getElementById('name').value.trim(),
    companyName: document.getElementById('companyName').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
    logoUrl: document.getElementById('logoUrl').value.trim(),
    primaryColor: document.getElementById('primaryColor').value.trim()
  };

  statusEl.textContent = 'Criando conta...';
  statusEl.className = 'text-sm text-slate-300';
  registerBtn.disabled = true;

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      statusEl.textContent = result.message || 'Falha ao cadastrar.';
      statusEl.className = 'text-sm text-rose-400';
      return;
    }

    if (result?.session?.access_token) {
      localStorage.setItem('syncho_access_token', result.session.access_token);
      localStorage.setItem('syncho_role', result.role || 'CLIENT');
      if (result.companyId) {
        localStorage.setItem('syncho_company_id', result.companyId);
      }
    }

    statusEl.textContent = 'Conta criada com sucesso. Redirecionando...';
    statusEl.className = 'text-sm text-emerald-400';

    window.location.href = result.redirectTo || '/dashboard';
  } catch (_error) {
    statusEl.textContent = 'Erro de rede ao cadastrar.';
    statusEl.className = 'text-sm text-rose-400';
  } finally {
    registerBtn.disabled = false;
  }
});
