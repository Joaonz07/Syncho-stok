import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { supabaseAdmin } from '../config/supabase';
import { LoginRequest, RegisterRequest, AuthResponse, UserRole } from '../../../shared/types';

export class AuthService {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const { data: supabaseData, error } = await supabaseAdmin.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error || !supabaseData.user) {
      throw new Error('Invalid credentials');
    }

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('User not found in database');
    }

    const token = this.generateToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      companyId: user.companyId,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        companyId: user.companyId,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      accessToken: token,
    };
  }

  async register(data: RegisterRequest, companyId: string): Promise<AuthResponse> {
    // Create user in Supabase Auth
    const { data: supabaseData, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (error || !supabaseData.user) {
      throw new Error(error?.message ?? 'Failed to create user in Supabase');
    }

    // Create user record in our database
    const user = await prisma.user.create({
      data: {
        id: supabaseData.user.id,
        name: data.name,
        email: data.email,
        role: 'CLIENT',
        companyId,
      },
    });

    const token = this.generateToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      companyId: user.companyId,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        companyId: user.companyId,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      accessToken: token,
    };
  }

  private generateToken(payload: {
    sub: string;
    email: string;
    role: UserRole;
    companyId: string;
  }): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}

export const authService = new AuthService();
