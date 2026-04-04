const loadAdminDataBtn = document.getElementById('load-admin-data-btn');
const loadClientDataBtn = document.getElementById('load-client-data-btn');
const updatePlanBtn = document.getElementById('update-plan-btn');
const logoutBtn = document.getElementById('logout-btn');
const companyIdInput = document.getElementById('company-id');
const planSelect = document.getElementById('plan-select');
const subscriptionCompanyIdInput = document.getElementById('subscription-company-id');
const subscriptionStatusInput = document.getElementById('subscription-status');
const updateSubscriptionBtn = document.getElementById('update-subscription-btn');
const newCompanyNameInput = document.getElementById('new-company-name');
const newCompanyPlanInput = document.getElementById('new-company-plan');
const createCompanyBtn = document.getElementById('create-company-btn');
const newUserNameInput = document.getElementById('new-user-name');
const newUserEmailInput = document.getElementById('new-user-email');
const newUserPasswordInput = document.getElementById('new-user-password');
const newUserRoleInput = document.getElementById('new-user-role');
const newUserCompanyIdInput = document.getElementById('new-user-company-id');
const createUserBtn = document.getElementById('create-user-btn');
const companyFilterInput = document.getElementById('company-filter');
const applyCompanyFilterBtn = document.getElementById('apply-company-filter-btn');
const clearCompanyFilterBtn = document.getElementById('clear-company-filter-btn');
const adminStatus = document.getElementById('admin-status');
const adminStats = document.getElementById('admin-stats');
const companiesTable = document.getElementById('companies-table');
const usersTable = document.getElementById('users-table');
const productsTable = document.getElementById('products-table');
const salesTable = document.getElementById('sales-table');
const chatsTable = document.getElementById('chats-table');

let session = null;
let selectedCompanyId = '';

const setStatus = (message, type) => {
  adminStatus.textContent = message;
  adminStatus.className = type ? `status ${type}` : 'status';
};

const authHeaders = () => ({
  Authorization: `Bearer ${session?.token || ''}`,
  'Content-Type': 'application/json'
});

const makeStat = (label, value) => `
  <article class="stat-card">
    <p>${label}</p>
    <strong>${value}</strong>
  </article>
`;

const tableHtml = (rows, columns) => {
  if (!rows || !rows.length) {
    return '<p class="empty">Sem dados para exibir.</p>';
  }

  const thead = columns.map((column) => `<th>${column.label}</th>`).join('');
  const tbody = rows
    .map((row) => {
      const cells = columns
        .map((column) => `<td>${row[column.key] ?? ''}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
};

const renderAdminData = (payload) => {
  adminStats.innerHTML = [
    makeStat('Role', payload.role || '-'),
    makeStat('Faturamento mensal', `R$ ${Number(payload.monthlyRecurring || 0).toFixed(2)}`),
    makeStat('Empresas', payload.companies?.length || 0),
    makeStat('Usuarios', payload.users?.length || 0),
    makeStat('Produtos', payload.products?.length || 0),
    makeStat('Vendas', payload.sales?.length || 0),
    makeStat('Chats', payload.chats?.length || 0)
  ].join('');

  companiesTable.innerHTML = tableHtml(payload.companies, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nome' },
    { key: 'plan', label: 'Plano' }
  ]);

  usersTable.innerHTML = tableHtml(payload.users, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'company_id', label: 'Empresa' }
  ]);

  productsTable.innerHTML = tableHtml(payload.products, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nome' },
    { key: 'code', label: 'Codigo' },
    { key: 'quantity', label: 'Qtde' },
    { key: 'company_id', label: 'Empresa' }
  ]);

  salesTable.innerHTML = tableHtml(payload.sales, [
    { key: 'id', label: 'ID' },
    { key: 'user_id', label: 'Usuario' },
    { key: 'total', label: 'Total' },
    { key: 'company_id', label: 'Empresa' }
  ]);

  chatsTable.innerHTML = tableHtml(payload.chats, [
    { key: 'id', label: 'ID' },
    { key: 'sender_id', label: 'Remetente' },
    { key: 'content', label: 'Mensagem' },
    { key: 'company_id', label: 'Empresa' }
  ]);

  if (Array.isArray(payload.companies)) {
    const currentValue = selectedCompanyId;
    const options = ['<option value="">Todas as empresas</option>']
      .concat(
        payload.companies.map(
          (company) =>
            `<option value="${company.id}">${company.name || company.id}</option>`
        )
      )
      .join('');

    companyFilterInput.innerHTML = options;
    companyFilterInput.value = currentValue;
  }
};

const buildQuery = () => {
  if (!selectedCompanyId) {
    return '';
  }

  return `?companyId=${encodeURIComponent(selectedCompanyId)}`;
};

loadAdminDataBtn.addEventListener('click', async () => {
  if (!session?.token) {
    return;
  }

  setStatus('Carregando visao global...');
  const response = await fetch(`/api/admin/dashboard${buildQuery()}`, {
    headers: authHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      window.AuthGuard.logout();
      return;
    }

    setStatus(result.message || 'Falha ao carregar painel admin.', 'error');
    return;
  }

  renderAdminData(result);
  setStatus('Painel admin atualizado.', 'success');
});

loadClientDataBtn.addEventListener('click', async () => {
  if (!session?.token) {
    return;
  }

  setStatus('Consultando rota de dashboard comum...');
  const response = await fetch(`/api/dashboard/data${buildQuery()}`, {
    headers: authHeaders()
  });

  const result = await response.json();
  if (!response.ok) {
    setStatus(result.message || 'Falha ao consultar rota client.', 'error');
    return;
  }

  renderAdminData({
    role: result.role,
    companies: [],
    users: result.users,
    products: result.products,
    sales: result.sales,
    chats: result.chats
  });
  setStatus('Rota /api/dashboard/data carregada.', 'success');
});

updatePlanBtn.addEventListener('click', async () => {
  if (!session?.token) {
    return;
  }

  const companyId = String(companyIdInput.value || '').trim();
  const plan = String(planSelect.value || '').toUpperCase();

  if (!companyId) {
    setStatus('Informe o Company ID para atualizar o plano.', 'error');
    return;
  }

  setStatus('Atualizando plano da empresa...');
  const response = await fetch(`/api/admin/companies/${companyId}/plan`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ plan })
  });

  const result = await response.json();

  if (!response.ok) {
    setStatus(result.message || 'Falha ao atualizar plano.', 'error');
    return;
  }

  setStatus('Plano atualizado com sucesso.', 'success');
  loadAdminDataBtn.click();
});

updateSubscriptionBtn.addEventListener('click', async () => {
  if (!session?.token) {
    return;
  }

  const companyId = String(subscriptionCompanyIdInput.value || '').trim();
  const status = String(subscriptionStatusInput.value || 'ACTIVE').toUpperCase();

  if (!companyId) {
    setStatus('Informe o Company ID para atualizar status.', 'error');
    return;
  }

  const response = await fetch(`/api/admin/companies/${companyId}/subscription`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });

  const result = await response.json();

  if (!response.ok) {
    setStatus(result.message || 'Falha ao atualizar status.', 'error');
    return;
  }

  setStatus('Status da assinatura atualizado.', 'success');
  loadAdminDataBtn.click();
});

createCompanyBtn.addEventListener('click', async () => {
  if (!session?.token) {
    return;
  }

  const name = String(newCompanyNameInput.value || '').trim();
  const plan = String(newCompanyPlanInput.value || 'BASIC').toUpperCase();

  if (!name) {
    setStatus('Informe o nome da empresa.', 'error');
    return;
  }

  setStatus('Criando empresa...');
  const response = await fetch('/api/admin/companies', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, plan })
  });

  const result = await response.json();

  if (!response.ok) {
    setStatus(result.message || 'Falha ao criar empresa.', 'error');
    return;
  }

  setStatus('Empresa criada com sucesso.', 'success');
  newCompanyNameInput.value = '';
  loadAdminDataBtn.click();
});

createUserBtn.addEventListener('click', async () => {
  if (!session?.token) {
    return;
  }

  const name = String(newUserNameInput.value || '').trim();
  const email = String(newUserEmailInput.value || '').trim();
  const password = String(newUserPasswordInput.value || '');
  const role = String(newUserRoleInput.value || 'CLIENT').toUpperCase();
  const companyId = String(newUserCompanyIdInput.value || '').trim();

  if (!name || !email || !password) {
    setStatus('Preencha nome, email e senha do usuario.', 'error');
    return;
  }

  if (role === 'CLIENT' && !companyId) {
    setStatus('Para CLIENT, informe Company ID.', 'error');
    return;
  }

  setStatus('Criando usuario...');
  const response = await fetch('/api/admin/users', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, email, password, role, companyId })
  });

  const result = await response.json();

  if (!response.ok) {
    setStatus(result.message || 'Falha ao criar usuario.', 'error');
    return;
  }

  setStatus('Usuario criado com sucesso.', 'success');
  newUserNameInput.value = '';
  newUserEmailInput.value = '';
  newUserPasswordInput.value = '';
  newUserCompanyIdInput.value = '';
  loadAdminDataBtn.click();
});

applyCompanyFilterBtn.addEventListener('click', () => {
  selectedCompanyId = String(companyFilterInput.value || '').trim();
  loadAdminDataBtn.click();
});

clearCompanyFilterBtn.addEventListener('click', () => {
  selectedCompanyId = '';
  companyFilterInput.value = '';
  loadAdminDataBtn.click();
});

const init = async () => {
  session = await window.AuthGuard.validateSession('ADMIN');

  if (!session) {
    return;
  }

  loadAdminDataBtn.click();
};

logoutBtn.addEventListener('click', window.AuthGuard.logout);
init();
