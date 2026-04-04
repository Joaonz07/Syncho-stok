const statusEl = document.getElementById('plans-status');
const chooseButtons = Array.from(document.querySelectorAll('.choose-plan'));

const token = window.AuthGuard.getToken();
const role = window.AuthGuard.getRole();
const companyId = localStorage.getItem('syncho_company_id') || '';

if (!token || !role || role !== 'ADMIN' && !companyId) {
  statusEl.textContent = 'Para escolher plano, entre com sua conta e tenha uma empresa vinculada.';
}

chooseButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const plan = button.dataset.plan;

    if (!plan) {
      return;
    }

    if (!token) {
      window.location.href = '/login';
      return;
    }

    statusEl.textContent = 'Processando assinatura (simulada)...';

    const targetCompanyId = role === 'ADMIN'
      ? prompt('Informe o Company ID para alterar o plano:') || ''
      : companyId;

    if (!targetCompanyId) {
      statusEl.textContent = 'Company ID nao informado.';
      return;
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const response = await fetch('/api/dashboard/subscribe', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan,
        companyId: targetCompanyId,
        expiresAt: expiresAt.toISOString()
      })
    });

    const result = await response.json();

    if (!response.ok) {
      statusEl.textContent = result.message || 'Falha ao escolher plano.';
      return;
    }

    statusEl.textContent = `Plano ${plan} ativado com sucesso (simulado).`;
  });
});
