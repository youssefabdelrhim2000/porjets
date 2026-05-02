// ============================================
// Services Export Hub
// Single entry point for all services
// ============================================

// Local Storage Services (Current - للتطوير)
export { storageService, type IStorageService } from './storage/StorageService';
export { authService, type IAuthService } from './auth/AuthService';

// API Services (Laravel Backend - للإنتاج)
export { 
  apiClient,
  apiStorageService,
  apiAuthService,
  type ApiResponse,
  type IApiAuthService,
} from './api';

// ============================================
// للتبديل إلى Laravel API:
// 1. استبدل storageService بـ apiStorageService
// 2. استبدل authService بـ apiAuthService
// 3. أضف VITE_API_URL في ملف .env
// ============================================
