// ============================================
// Storage Service Interface & Implementation
// Refactored for Laravel API Integration
// ============================================

import type { Notebook, NotebookEntry, RegisteredUser } from '@/types/notebook';
import type { Result } from '@/types';

// استيراد الخدمة اللي بتكلم الـ API فعلياً
import { apiStorageService } from '../api/ApiStorageService';

// 1. تعديل الـ Interface ليدعم الـ Async
// لازم نحدث الـ Interface عشان يقبل Promises لأن الـ API مش فوري
export interface IStorageService {
  // Users
  getUsers(): RegisteredUser[]; // للرجوع للخلف (Deprecated)
  getUsersAsync(): Promise<RegisteredUser[]>;
  getUserById(id: string): RegisteredUser | undefined;
  getUserByIdAsync(id: string): Promise<RegisteredUser | undefined>;
  saveUser(user: RegisteredUser): Result;
  saveUserAsync(user: RegisteredUser): Promise<Result>;
  updateUser(id: string, updates: Partial<RegisteredUser>): Result;
  updateUserAsync(id: string, updates: Partial<RegisteredUser>): Promise<Result>;
  deleteUser(id: string): Result;
  deleteUserAsync(id: string): Promise<Result>;
  
  // Notebooks
  getNotebooks(): Notebook[];
  getNotebooksAsync(): Promise<Notebook[]>;
  getNotebookById(id: string): Notebook | undefined;
  getNotebookByIdAsync(id: string): Promise<Notebook | undefined>;
  saveNotebook(notebook: Notebook): Result;
  saveNotebookAsync(notebook: Notebook): Promise<Result>;
  deleteNotebook(id: string): Result;
  deleteNotebookAsync(id: string): Promise<Result>;
  
  // Entries
  getEntries(notebookId?: string): NotebookEntry[];
  getEntriesAsync(notebookId?: string): Promise<NotebookEntry[]>;
  getEntryById(id: string): NotebookEntry | undefined;
  getEntryByIdAsync(id: string): Promise<NotebookEntry | undefined>;
  saveEntry(entry: NotebookEntry): Result;
  saveEntryAsync(entry: NotebookEntry): Promise<Result>;
  deleteEntry(id: string): Result;
  deleteEntryAsync(id: string): Promise<Result>;
}

/**
 * 2. تصدير الـ Instance المعتمد.
 * هنا بنعمل Mapping لاسم storageService عشان المشروع كله يفضل شغال،
 * بس فعلياً بنخليه يستخدم الـ apiStorageService اللي مربوط بـ Laravel.
 */
export const storageService: IStorageService = apiStorageService;