const form = document.getElementById('login-form');
const statusEl = document.getElementById('status');
const submitBtn = document.getElementById('submit-btn');
const passwordInput = document.getElementById('password');
const showPasswordInput = document.getElementById('show-password');

const saveSession = (result) => {
  const accessToken = result?.session?.access_token;

  if (accessToken) {
    localStorage.setItem('syncho_access_token', accessToken);
  }

  if (result?.role) {
    localStorage.setItem('syncho_role', result.role);
  }

  if (result?.companyId) {
    localStorage.setItem('syncho_company_id', result.companyId);
  } else {
    localStorage.removeItem('syncho_company_id');
  }
};

const hasToken = window.AuthGuard.getToken();
const currentRole = window.AuthGuard.getRole();

if (hasToken && currentRole === 'ADMIN') {
  window.location.href = '/admin';
}

if (hasToken && currentRole === 'CLIENT') {
  window.location.href = '/dashboard';
}

showPasswordInput.addEventListener('change', () => {
  passwordInput.type = showPasswordInput.checked ? 'text' : 'password';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  statusEl.textContent = 'Validando acesso...';
  statusEl.className = 'status';
  submitBtn.disabled = true;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (!response.ok) {
      statusEl.textContent = result.message || 'Falha no login.';
      statusEl.className = 'status error';
      return;
    }

    const userEmail = result?.user?.email || email;
    statusEl.textContent = `Login realizado com sucesso para ${userEmail}.`;
    statusEl.className = 'status success';

    saveSession(result);

    const redirectTo = result?.redirectTo || '/dashboard';
    window.location.href = redirectTo;
  } catch (_error) {
    statusEl.textContent = 'Erro de rede ao tentar logar.';
    statusEl.className = 'status error';
  } finally {
    submitBtn.disabled = false;
  }
});
