// ============================================
// API Auth Service - Laravel Backend Auth
// ============================================

import { apiClient } from './ApiClient';
import type { RegisteredUser } from '@/types/notebook';

interface LoginResponse {
  user: RegisteredUser;
  token: string;
}

interface AuthResult {
  success: boolean;
  user?: RegisteredUser;
  error?: string;
}

export interface IApiAuthService {
  login(username: string, password: string): Promise<AuthResult>;
  register(username: string, password: string, displayName: string): Promise<AuthResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<RegisteredUser | null>;
  isAuthenticated(): boolean;
}

class ApiAuthService implements IApiAuthService {
  
  async login(username: string, password: string): Promise<AuthResult> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        username,
        password,
      });

      if (response.success && response.data) {
        apiClient.setToken(response.data.token);
        localStorage.setItem('current_user', JSON.stringify(response.data.user));
        return { success: true, user: response.data.user };
      }

      return { success: false, error: response.message || 'فشل تسجيل الدخول' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'فشل الاتصال بالخادم' 
      };
    }
  }

  async register(username: string, password: string, displayName: string): Promise<AuthResult> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/register', {
        username,
        password,
        display_name: displayName,
      });

      if (response.success && response.data) {
        apiClient.setToken(response.data.token);
        localStorage.setItem('current_user', JSON.stringify(response.data.user));
        return { success: true, user: response.data.user };
      }

      return { success: false, error: response.message || 'فشل التسجيل' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'فشل الاتصال بالخادم' 
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {});
    } catch {
      // Ignore logout errors
    } finally {
      apiClient.setToken(null);
      localStorage.removeItem('current_user');
    }
  }

  async getCurrentUser(): Promise<RegisteredUser | null> {
    // First check local storage for cached user
    const cached = localStorage.getItem('current_user');
    if (!cached) return null;

    // Verify with server if token exists
    if (apiClient.getToken()) {
      try {
        const response = await apiClient.get<RegisteredUser>('/auth/me');
        if (response.success && response.data) {
          localStorage.setItem('current_user', JSON.stringify(response.data));
          return response.data;
        }
      } catch {
        // Token invalid, clear auth
        this.logout();
        return null;
      }
    }

    return JSON.parse(cached);
  }

  isAuthenticated(): boolean {
    return !!apiClient.getToken();
  }
}

export const apiAuthService = new ApiAuthService();
