// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'CLIENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  companyId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  companyId?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// ─── Company & Subscription ───────────────────────────────────────────────────

export type SubscriptionPlan = 'BASIC' | 'PRO' | 'PREMIUM';

export interface Company {
  id: string;
  name: string;
  plan: SubscriptionPlan;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyRequest {
  name: string;
  plan?: SubscriptionPlan;
}

export interface UpdatePlanRequest {
  plan: SubscriptionPlan;
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  quantity: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  code: string;
  price: number;
  quantity: number;
}

export interface UpdateProductRequest {
  name?: string;
  code?: string;
  price?: number;
  quantity?: number;
}

// ─── Sales ───────────────────────────────────────────────────────────────────

export interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  companyId: string;
  userId: string;
  total: number;
  items: SaleItem[];
  createdAt: string;
}

export interface CreateSaleRequest {
  items: SaleItem[];
}

// ─── Stock Movements ─────────────────────────────────────────────────────────

export type MovementType = 'IN' | 'OUT';

export interface StockMovement {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number;
  reason: string;
  createdAt: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  lowStockProducts: Product[];
  topProducts: Array<{ product: Product; totalSold: number }>;
  monthlySales: Array<{ month: string; total: number }>;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  companyId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
