const loadDataBtn = document.getElementById('load-data-btn');
const logoutBtn = document.getElementById('logout-btn');
const createProductBtn = document.getElementById('create-product-btn');
const createSaleBtn = document.getElementById('create-sale-btn');
const clientStatus = document.getElementById('client-status');
const clientStats = document.getElementById('client-stats');
const dashboardSummary = document.getElementById('dashboard-summary');
const productsTable = document.getElementById('products-table');
const salesTable = document.getElementById('sales-table');
const usersTable = document.getElementById('users-table');
const chatsTable = document.getElementById('chats-table');
const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));
const newProductNameInput = document.getElementById('new-product-name');
const newProductCodeInput = document.getElementById('new-product-code');
const newProductPriceInput = document.getElementById('new-product-price');
const newProductQuantityInput = document.getElementById('new-product-quantity');
const newSaleTotalInput = document.getElementById('new-sale-total');

let session = null;

const setStatus = (message, type) => {
  clientStatus.textContent = message;
  clientStatus.className = type ? `status ${type}` : 'status';
};

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

const renderData = (payload) => {
  clientStats.innerHTML = [
    makeStat('Role', payload.role || '-'),
    makeStat('Company', payload.companyId || '-'),
    makeStat('Produtos', payload.products?.length || 0),
    makeStat('Vendas', payload.sales?.length || 0),
    makeStat('Usuarios', payload.users?.length || 0),
    makeStat('Chats', payload.chats?.length || 0)
  ].join('');

  productsTable.innerHTML = tableHtml(payload.products, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nome' },
    { key: 'code', label: 'Codigo' },
    { key: 'quantity', label: 'Qtde' }
  ]);

  salesTable.innerHTML = tableHtml(payload.sales, [
    { key: 'id', label: 'ID' },
    { key: 'company_id', label: 'Empresa' },
    { key: 'user_id', label: 'Usuario' },
    { key: 'total', label: 'Total' }
  ]);

  usersTable.innerHTML = tableHtml(payload.users, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' }
  ]);

  chatsTable.innerHTML = tableHtml(payload.chats, [
    { key: 'id', label: 'ID' },
    { key: 'company_id', label: 'Empresa' },
    { key: 'sender_id', label: 'Remetente' },
    { key: 'content', label: 'Mensagem' }
  ]);

  dashboardSummary.innerHTML = tableHtml(
    [
      { indicador: 'Total de produtos', valor: payload.products?.length || 0 },
      { indicador: 'Total de vendas', valor: payload.sales?.length || 0 },
      {
        indicador: 'Faturamento',
        valor: (payload.sales || []).reduce((sum, sale) => sum + Number(sale.total || 0), 0).toFixed(2)
      },
      { indicador: 'Usuarios ativos', valor: payload.users?.length || 0 },
      { indicador: 'Mensagens', valor: payload.chats?.length || 0 }
    ],
    [
      { key: 'indicador', label: 'Indicador' },
      { key: 'valor', label: 'Valor' }
    ]
  );
};

const switchTab = (tabId) => {
  tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabId);
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === tabId);
  });
};

const loadData = async () => {
  if (!session?.token) {
    return;
  }

  setStatus('Carregando dados da sua empresa...');

  try {
    const response = await fetch('/api/dashboard/data', {
      headers: {
        Authorization: `Bearer ${session.token}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        window.AuthGuard.logout();
        return;
      }

      setStatus(result.message || 'Falha ao carregar dados.', 'error');
      return;
    }

    renderData(result);
    setStatus('Dados atualizados com sucesso.', 'success');
  } catch (_error) {
    setStatus('Erro de rede ao carregar dashboard.', 'error');
  }
};

const createProduct = async () => {
  if (!session?.token) {
    return;
  }

  const name = String(newProductNameInput.value || '').trim();
  const code = String(newProductCodeInput.value || '').trim();
  const price = Number(newProductPriceInput.value || 0);
  const quantity = Number(newProductQuantityInput.value || 0);

  if (!name || !code || !Number.isFinite(price)) {
    setStatus('Preencha nome, codigo e preco do produto.', 'error');
    return;
  }

  setStatus('Adicionando produto...');

  const response = await fetch('/api/dashboard/products', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, code, price, quantity })
  });

  const result = await response.json();

  if (!response.ok) {
    setStatus(result.message || 'Falha ao adicionar produto.', 'error');
    return;
  }

  newProductNameInput.value = '';
  newProductCodeInput.value = '';
  newProductPriceInput.value = '';
  newProductQuantityInput.value = '';
  setStatus('Produto adicionado com sucesso.', 'success');
  await loadData();
  switchTab('tab-products');
};

const createSale = async () => {
  if (!session?.token) {
    return;
  }

  const total = Number(newSaleTotalInput.value || 0);

  if (!Number.isFinite(total) || total <= 0) {
    setStatus('Informe um valor valido para a venda.', 'error');
    return;
  }

  setStatus('Registrando venda...');

  const response = await fetch('/api/dashboard/sales', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ total })
  });

  const result = await response.json();

  if (!response.ok) {
    setStatus(result.message || 'Falha ao registrar venda.', 'error');
    return;
  }

  newSaleTotalInput.value = '';
  setStatus('Venda registrada com sucesso.', 'success');
  await loadData();
  switchTab('tab-sales');
};

const init = async () => {
  session = await window.AuthGuard.validateSession('CLIENT');

  if (!session) {
    return;
  }

  await loadData();
};

loadDataBtn.addEventListener('click', loadData);
logoutBtn.addEventListener('click', window.AuthGuard.logout);
createProductBtn.addEventListener('click', createProduct);
createSaleBtn.addEventListener('click', createSale);
tabButtons.forEach((button) => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

init();
