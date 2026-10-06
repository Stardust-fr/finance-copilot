import { api } from '@/lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await api.post<{ success: boolean; data: AuthResponse }>('/auth/register', data);
  return res.data.data;
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await api.post<{ success: boolean; data: AuthResponse }>('/auth/login', data);
  return res.data.data;
}

export async function getMe(): Promise<AuthUser> {
  const res = await api.get<{ success: boolean; data: { user: AuthUser } }>('/auth/me');
  return res.data.data.user;
}

export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
    // Also set a cookie so Next.js middleware can read it for route protection
    document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
  }
}

export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    // Expire the cookie
    document.cookie = 'token=; path=/; max-age=0; SameSite=Strict';
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}
