// ============================================
// Application Constants & Configuration
// Central place for all app-wide constants
// ============================================

import { 
  Book, Users, Car, Building, Shield, FileText, ClipboardList, Map,
  Type, Hash, AlignLeft, Image, ListChecks, Calendar, Table, CalendarDays
} from 'lucide-react';
import type { FieldType } from '@/types/notebook';

// Storage Keys - centralized for easy migration to backend
export const STORAGE_KEYS = {
  USERS: 'central_security_users',
  NOTEBOOKS: 'central_security_notebooks',
  ENTRIES: 'central_security_entries',
  CURRENT_USER: 'current_user',
  THEME: 'app_theme',
} as const;

// Demo Users - for development/testing
export const DEMO_USERS = [
  { 
    id: 'demo-admin', 
    username: 'admin', 
    password: 'admin123', 
    role: 'admin' as const, 
    displayName: 'مدير النظام',
    permissions: [] as const,
  },
  { 
    id: 'demo-user', 
    username: 'user', 
    password: 'user123', 
    role: 'user' as const, 
    displayName: 'مستخدم عادي',
    permissions: [] as const,
  },
] as const;

// Notebook Color Themes
export const NOTEBOOK_COLORS = [
  { value: 'gold', label: 'ذهبي', class: 'from-amber-500/20 to-amber-600/10 border-amber-500/30' },
  { value: 'blue', label: 'أزرق', class: 'from-blue-500/20 to-blue-600/10 border-blue-500/30' },
  { value: 'green', label: 'أخضر', class: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30' },
  { value: 'purple', label: 'بنفسجي', class: 'from-purple-500/20 to-purple-600/10 border-purple-500/30' },
  { value: 'red', label: 'أحمر', class: 'from-red-500/20 to-red-600/10 border-red-500/30' },
  { value: 'cyan', label: 'سماوي', class: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30' },
] as const;

// Notebook Icons with their React components
export const NOTEBOOK_ICONS = [
  { value: 'book', label: 'دفتر', icon: Book },
  { value: 'users', label: 'مستخدمين', icon: Users },
  { value: 'car', label: 'سيارات', icon: Car },
  { value: 'building', label: 'مباني', icon: Building },
  { value: 'shield', label: 'أمن', icon: Shield },
  { value: 'file', label: 'ملفات', icon: FileText },
  { value: 'clipboard', label: 'تقارير', icon: ClipboardList },
  { value: 'map', label: 'خرائط', icon: Map },
] as const;

// Icon Map for dynamic rendering
export const ICON_MAP: Record<string, React.ElementType> = {
  book: Book,
  users: Users,
  car: Car,
  building: Building,
  shield: Shield,
  file: FileText,
  clipboard: ClipboardList,
  map: Map,
};

// Field Types Configuration
export const FIELD_TYPES: Array<{ value: FieldType; label: string; description: string }> = [
  { value: 'text', label: 'نص', description: 'حقل نصي عادي' },
  { value: 'number', label: 'رقم', description: 'أرقام فقط' },
  { value: 'textarea', label: 'نص طويل', description: 'نص متعدد الأسطر' },
  { value: 'date', label: 'تاريخ', description: 'اختيار تاريخ' },
  { value: 'image', label: 'صورة', description: 'رفع صورة' },
  { value: 'choice', label: 'اختيار', description: 'اختيار من قائمة' },
  { value: 'compound', label: 'حقل مركب', description: 'عدة حقول فرعية' },
  { value: 'yearlyBatches', label: 'دفعات سنوية', description: 'بيانات لكل سنة' },
  { value: 'selectableBatches', label: 'دفعات قابلة للاختيار', description: 'اختيار دفعة من قائمة' },
  { value: 'quarterlyInvestigations', label: 'تحريات فصلية', description: 'بيانات فصلية لعدة سنوات' },
  { value: 'customTable', label: 'جدول مخصص', description: 'جدول بأعمدة وصفوف مخصصة' },
  { value: 'monthlyData', label: 'بيانات شهرية', description: 'بيانات لكل شهر من السنة' },
];

// Field Type Icons for rendering
export const FIELD_TYPE_ICONS: Record<FieldType, React.ElementType> = {
  text: Type,
  number: Hash,
  textarea: AlignLeft,
  image: Image,
  choice: ListChecks,
  date: Calendar,
  compound: Type,
  yearlyBatches: Calendar,
  selectableBatches: ListChecks,
  quarterlyInvestigations: Calendar,
  customTable: Table,
  monthlyData: CalendarDays,
};

// User Permissions Configuration
export const USER_PERMISSIONS = [
  { value: 'create_notebooks', label: 'إنشاء دفاتر', icon: 'plus' },
  { value: 'edit_notebooks', label: 'تعديل دفاتر', icon: 'edit' },
  { value: 'delete_notebooks', label: 'حذف دفاتر', icon: 'trash' },
  { value: 'import_data', label: 'استيراد بيانات', icon: 'upload' },
  { value: 'export_data', label: 'تصدير بيانات', icon: 'download' },
  { value: 'manage_users', label: 'إدارة المستخدمين', icon: 'users' },
  { value: 'edit_entries', label: 'تعديل السجلات', icon: 'edit' },
  { value: 'delete_entries', label: 'حذف السجلات', icon: 'trash' },
  { value: 'view_audit', label: 'عرض سجل التتبع', icon: 'eye' },
] as const;

// Validation Rules
export const VALIDATION = {
  USERNAME_MIN_LENGTH: 3,
  PASSWORD_MIN_LENGTH: 6,
  MAX_FIELD_NAME_LENGTH: 50,
  MAX_NOTEBOOK_NAME_LENGTH: 100,
} as const;

// UI Constants
export const UI = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 3000,
} as const;

// Date Formatting
export const DATE_LOCALE = 'ar-EG';
