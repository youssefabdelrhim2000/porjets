// ============================================
// Authentication Service
// Compatible with your existing Axios setup
// ============================================

import api from '@/lib/axios'; // 👈 ده ملفك أنت زي ما هو
import { STORAGE_KEYS } from '@/lib/constants';
import type { Result, UserSession } from '@/types';

// تعريف شكل الرد اللي جاي من لارافيل
interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
    display_name?: string;
  };
}

export interface IAuthService {
  authenticate(username: string, password: string): Promise<Result<UserSession>>;
  register(username: string, password: string, displayName: string): Promise<Result>;
  getCurrentSession(): UserSession | null;
  logout(): void;
}

class AuthService implements IAuthService {
  
  // 1. تسجيل الدخول
  async authenticate(username: string, password: string): Promise<Result<UserSession>> {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername) return { success: false, error: 'يرجى إدخال اسم المستخدم' };
    if (!trimmedPassword) return { success: false, error: 'يرجى إدخال كلمة المرور' };

    try {
      // بنستخدم الـ api بتاعك
      const response = await api.post<AuthResponse>('/login', {
        username: trimmedUsername,
        password: trimmedPassword
      });

      const { token, user } = response.data;

      // ✅ الخطوة دي عشان كودك يشتغل:
      // بنحفظ التوكن باسم 'token' عشان الـ Interceptor بتاعك يلاقيه
      localStorage.setItem('token', token);

      // تجهيز بيانات الجلسة (للعرض فقط)
      const session: UserSession = {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.display_name || user.username,
      };
      
      this.saveSession(session);

      return { success: true, data: session };

    } catch (error: any) {
      console.error('Login error:', error);
      const msg = error.response?.data?.message || 'خطأ في تسجيل الدخول';
      return { success: false, error: msg };
    }
  }

  // 2. إنشاء حساب جديد
  async register(username: string, password: string, displayName: string): Promise<Result> {
    try {
      await api.post('/register', {
        username: username.trim(),
        password: password.trim(),
        display_name: displayName.trim(),
        role: 'user'
      });

      return { success: true };
    } catch (error: any) {
      console.error('Register error:', error);
      const msg = error.response?.data?.message || 'فشل إنشاء الحساب';
      return { success: false, error: msg };
    }
  }

  // 3. إدارة الجلسة
  getCurrentSession(): UserSession | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  private saveSession(session: UserSession): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(session));
  }

  // 4. تسجيل الخروج
  logout(): void {
    // أهم حاجة نمسح التوكن عشان الـ Interceptor بتاعك يبطل يبعته
    localStorage.removeItem('token'); 
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    
    // توجيه لصفحة الدخول
    window.location.href = '/login';
  }
}

export const authService = new AuthService();