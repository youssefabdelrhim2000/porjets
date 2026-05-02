// ============================================
// User-Related Type Definitions
// ============================================

// User info for attribution
export interface UserInfo {
  userId: string;
  username: string;
  displayName: string;
}

// Current user session
export interface UserSession {
  id: string;
  username: string;
  role: 'admin' | 'user';
  displayName: string;
}

// Login credentials
export interface LoginCredentials {
  username: string;
  password: string;
}

// Auth result
export interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserSession;
}
