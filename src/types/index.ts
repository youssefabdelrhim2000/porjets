// ============================================
// Central Type Definitions
// Re-exports and utility types
// ============================================

// Re-export all notebook types
export * from './notebook';

// Re-export form types
export * from './form';

// Re-export user types
export * from './user';

// Utility Types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// Generic Result type for operations
export interface Result<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pagination types for future use
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Sort types
export type SortDirection = 'asc' | 'desc';

export interface SortParams {
  field: string;
  direction: SortDirection;
}

// Filter types
export interface FilterParams {
  field: string;
  value: string;
  operator: 'eq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
}

// Theme type
export type Theme = 'light' | 'dark';
