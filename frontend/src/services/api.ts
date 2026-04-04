import axios from 'axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  Sale,
  CreateSaleRequest,
  Company,
  CreateCompanyRequest,
  SubscriptionPlan,
  ChatMessage,
  DashboardStats,
  StockMovement,
} from '@shared/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<{ success: boolean; data: AuthResponse }>('/api/auth/login', data),

  register: (data: RegisterRequest & { companyId: string }) =>
    api.post<{ success: boolean; data: AuthResponse }>('/api/auth/register', data),

  me: () =>
    api.get<{ success: boolean; data: AuthResponse['user'] }>('/api/auth/me'),
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const productsApi = {
  list: () =>
    api.get<{ success: boolean; data: Product[] }>('/api/products'),

  get: (id: string) =>
    api.get<{ success: boolean; data: Product }>(`/api/products/${id}`),

  create: (data: CreateProductRequest) =>
    api.post<{ success: boolean; data: Product }>('/api/products', data),

  update: (id: string, data: UpdateProductRequest) =>
    api.put<{ success: boolean; data: Product }>(`/api/products/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/api/products/${id}`),

  movements: (id: string) =>
    api.get<{ success: boolean; data: StockMovement[] }>(`/api/products/${id}/movements`),
};

// ─── Sales ────────────────────────────────────────────────────────────────────

export const salesApi = {
  list: () =>
    api.get<{ success: boolean; data: Sale[] }>('/api/sales'),

  get: (id: string) =>
    api.get<{ success: boolean; data: Sale }>(`/api/sales/${id}`),

  create: (data: CreateSaleRequest) =>
    api.post<{ success: boolean; data: Sale }>('/api/sales', data),
};

// ─── Companies ────────────────────────────────────────────────────────────────

export const companiesApi = {
  list: () =>
    api.get<{ success: boolean; data: Company[] }>('/api/companies'),

  get: (id: string) =>
    api.get<{ success: boolean; data: Company }>(`/api/companies/${id}`),

  create: (data: CreateCompanyRequest) =>
    api.post<{ success: boolean; data: Company }>('/api/companies', data),

  updatePlan: (id: string, plan: SubscriptionPlan) =>
    api.patch<{ success: boolean; data: Company }>(`/api/companies/${id}/plan`, { plan }),

  users: (id: string) =>
    api.get<{ success: boolean; data: AuthResponse['user'][] }>(`/api/companies/${id}/users`),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chatApi = {
  messages: () =>
    api.get<{ success: boolean; data: ChatMessage[] }>('/api/chat'),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  stats: () =>
    api.get<{ success: boolean; data: DashboardStats }>('/api/dashboard/stats'),
};

export default api;
