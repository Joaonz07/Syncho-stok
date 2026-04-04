import { supabaseAdmin } from '../supabaseClient';
import type { AuthUser } from '../types/auth';

type SupportedTable = 'companies' | 'users' | 'products' | 'sales' | 'messages' | 'leads';

const tableAliases: Record<SupportedTable, string[]> = {
  companies: ['companies', 'Company'],
  users: ['users', 'User'],
  products: ['products', 'Product'],
  sales: ['sales', 'Sale'],
  messages: ['messages', 'Message'],
  leads: ['leads', 'Lead']
};

const companyFieldAliases = ['company_id', 'companyId', 'companyID'];

const selectAllWithAliases = async (table: SupportedTable) => {
  for (const tableName of tableAliases[table]) {
    const response = await supabaseAdmin.from(tableName).select('*');

    if (!response.error) {
      return response;
    }
  }

  return {
    data: [],
    error: { message: `Tabela nao encontrada para ${table}.` }
  };
};

const queryByCompany = async (table: SupportedTable, companyId: string) => {
  for (const tableName of tableAliases[table]) {
    for (const companyField of companyFieldAliases) {
      const response = await supabaseAdmin.from(tableName).select('*').eq(companyField, companyId);

      if (!response.error) {
        return response;
      }
    }
  }

  return {
    data: [],
    error: { message: `Nao foi possivel filtrar ${table} por company_id.` }
  };
};

const queryCompanyList = async (companyId: string) => {
  for (const tableName of tableAliases.companies) {
    const response = await supabaseAdmin.from(tableName).select('*').eq('id', companyId);

    if (!response.error) {
      return response;
    }
  }

  return {
    data: [],
    error: { message: 'Nao foi possivel filtrar companies por id.' }
  };
};

export const getScopedData = async (table: SupportedTable, authUser: AuthUser) => {
  if (authUser.role === 'ADMIN') {
    const { data, error } = await selectAllWithAliases(table);
    return {
      data: data || [],
      error: error?.message || null
    };
  }

  if (!authUser.companyId) {
    return {
      data: [],
      error: 'Usuario CLIENT sem company_id associado.'
    };
  }

  const { data, error } = await queryByCompany(table, authUser.companyId);
  return {
    data: data || [],
    error: error?.message || null
  };
};

export const getGlobalData = async (companyId?: string) => {
  const normalizedCompanyId = String(companyId || '').trim();

  if (normalizedCompanyId) {
    const [companies, users, products, sales, messages] = await Promise.all([
      queryCompanyList(normalizedCompanyId),
      queryByCompany('users', normalizedCompanyId),
      queryByCompany('products', normalizedCompanyId),
      queryByCompany('sales', normalizedCompanyId),
      queryByCompany('messages', normalizedCompanyId)
    ]);

    return {
      companies: companies.data || [],
      users: users.data || [],
      products: products.data || [],
      sales: sales.data || [],
      chats: messages.data || [],
      errors: [companies.error, users.error, products.error, sales.error, messages.error]
        .filter(Boolean)
        .map((error) => error?.message)
    };
  }

  const [companies, users, products, sales, messages] = await Promise.all([
    selectAllWithAliases('companies'),
    selectAllWithAliases('users'),
    selectAllWithAliases('products'),
    selectAllWithAliases('sales'),
    selectAllWithAliases('messages')
  ]);

  return {
    companies: companies.data || [],
    users: users.data || [],
    products: products.data || [],
    sales: sales.data || [],
    chats: messages.data || [],
    errors: [companies.error, users.error, products.error, sales.error, messages.error]
      .filter(Boolean)
      .map((error) => error?.message)
  };
};
