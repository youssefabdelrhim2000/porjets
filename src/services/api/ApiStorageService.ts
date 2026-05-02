// ============================================
// API Storage Service - Refactored for Axios
// ============================================

import api from '@/lib/axios'; // 👈 التعديل هنا: استيراد axios الموحد
import type { IStorageService } from '../storage/StorageService'; // تأكد من المسار حسب هيكلة ملفاتك
import type { Notebook, NotebookEntry, RegisteredUser } from '@/types/notebook';
import type { Result } from '@/types';

// واجهة مساعدة لتوحيد شكل الرد
interface LaravelResponse<T> {
  data: T;
  message?: string;
}

export class ApiStorageService implements IStorageService {
  
  // ==========================================
  // Users Management
  // ==========================================
  
  getUsers(): RegisteredUser[] {
    console.warn('⚠️ Sync getUsers is deprecated. Use getUsersAsync.');
    return [];
  }

  async getUsersAsync(): Promise<RegisteredUser[]> {
    try {
      // استخدمنا api بدل apiClient
      const response = await api.get<RegisteredUser[]>('/users');
      // لارافيل غالباً بيرجع الداتا جوه مفتاح data لو بتستخدم Resources
      // لو الكنترولر بيرجع array علطول، يبقى response.data هي الـ array
      // هنا بنعمل check بسيط
      const data = (response.data as any).data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return [];
    }
  }

  getUserById(id: string): RegisteredUser | undefined {
    console.warn('⚠️ Sync getUserById is deprecated.');
    return undefined;
  }

  async getUserByIdAsync(id: string): Promise<RegisteredUser | undefined> {
    try {
      const response = await api.get<RegisteredUser>(`/users/${id}`);
      return (response.data as any).data || response.data;
    } catch {
      return undefined;
    }
  }

  saveUser(user: RegisteredUser): Result {
    console.warn('⚠️ Sync saveUser is deprecated.');
    return { success: false, error: 'Use async method' };
  }

  async saveUserAsync(user: RegisteredUser): Promise<Result> {
    try {
      if (user.id && user.id !== 'new') {
        await api.put(`/users/${user.id}`, user);
      } else {
        await api.post('/users', user);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || error.message || 'فشل حفظ المستخدم' };
    }
  }

  updateUser(id: string, updates: Partial<RegisteredUser>): Result {
      // ... same pattern
      return { success: false, error: 'Use async method' };
  }
  
  async updateUserAsync(id: string, updates: Partial<RegisteredUser>): Promise<Result> {
      try {
          await api.put(`/users/${id}`, updates);
          return { success: true };
      } catch (error: any) {
          return { success: false, error: error.response?.data?.message || 'فشل التحديث' };
      }
  }

  deleteUser(id: string): Result {
      return { success: false, error: 'Use async method' };
  }

  async deleteUserAsync(id: string): Promise<Result> {
    try {
      await api.delete(`/users/${id}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'فشل حذف المستخدم' };
    }
  }

  // ==========================================
  // Notebooks Management
  // ==========================================
  
  getNotebooks(): Notebook[] {
    return [];
  }

  async getNotebooksAsync(): Promise<Notebook[]> {
    try {
      const response = await api.get('/notebooks');
      const data = (response.data as any).data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching notebooks:', error);
      return [];
    }
  }

  getNotebookById(id: string): Notebook | undefined {
    return undefined;
  }

  async getNotebookByIdAsync(id: string): Promise<Notebook | undefined> {
    try {
      const response = await api.get(`/notebooks/${id}`);
      return (response.data as any).data || response.data;
    } catch {
      return undefined;
    }
  }

  saveNotebook(notebook: Notebook): Result {
    return { success: false, error: 'Use async method' };
  }

  async saveNotebookAsync(notebook: Notebook): Promise<Result> {
    try {
      const payload = {
        name: notebook.name,
        description: notebook.description,
        icon: notebook.icon,
        color: notebook.color,
        fields: notebook.fields,
        sections: notebook.sections,
      };

      if (notebook.id) {
        await api.put(`/notebooks/${notebook.id}`, payload);
      } else {
        await api.post('/notebooks', payload);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'فشل حفظ الدفتر' };
    }
  }

  deleteNotebook(id: string): Result {
      return { success: false, error: 'Use async method' };
  }

  async deleteNotebookAsync(id: string): Promise<Result> {
    try {
      await api.delete(`/notebooks/${id}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'فشل حذف الدفتر' };
    }
  }

  // ==========================================
  // Entries Management
  // ==========================================
  
  getEntries(notebookId?: string): NotebookEntry[] {
    return [];
  }

  async getEntriesAsync(notebookId?: string): Promise<NotebookEntry[]> {
    try {
      const endpoint = notebookId ? `/entries?notebook_id=${notebookId}` : '/entries';
      const response = await api.get(endpoint);
      const data = (response.data as any).data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching entries:', error);
      return [];
    }
  }

  // باقي الدوال نفس الفكرة... استبدل apiClient بـ api
  getEntryById(id: string): NotebookEntry | undefined { return undefined; }

  async getEntryByIdAsync(id: string): Promise<NotebookEntry | undefined> {
      try {
          const response = await api.get(`/entries/${id}`);
          return (response.data as any).data || response.data;
      } catch { return undefined; }
  }

  saveEntry(entry: NotebookEntry): Result { return { success: false, error: 'Async only' }; }

  async saveEntryAsync(entry: NotebookEntry): Promise<Result> {
      try {
          // Laravel expects 'notebook_id' (snake_case)
          const payload = {
              notebook_id: entry.notebookId, 
              data: entry.data 
          };

          if (entry.id) {
              await api.put(`/entries/${entry.id}`, payload);
          } else {
              await api.post('/entries', payload);
          }
          return { success: true };
      } catch (error: any) {
          return { success: false, error: error.response?.data?.message || 'فشل الحفظ' };
      }
  }

  deleteEntry(id: string): Result { return { success: false, error: 'Async only' }; }

  async deleteEntryAsync(id: string): Promise<Result> {
      try {
          await api.delete(`/entries/${id}`);
          return { success: true };
      } catch (error: any) {
          return { success: false, error: error.response?.data?.message || 'فشل الحذف' };
      }
  }
}

export const apiStorageService = new ApiStorageService();