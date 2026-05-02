// Types for the Notebook System

export type FieldType = 'text' | 'number' | 'image' | 'choice' | 'date' | 'textarea' | 'compound' | 'yearlyBatches' | 'selectableBatches' | 'quarterlyInvestigations' | 'customTable' | 'flexibleTable' | 'monthlyData';
// Sub-field for compound fields (like address: country, city, district)
export interface SubField {
  id: string;
  name: string;
  placeholder?: string;
}

// Column definition for custom/flexible tables
export interface TableColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'compound';
  width?: string; // e.g., '100px', '20%'
  // For compound columns (مجموعة أعمدة فرعية داخل عمود واحد)
  subColumns?: TableColumn[];
  // Optional predefined options for dropdown-style columns
  options?: string[];
}

export interface FlexibleTableValue {
  columns: TableColumn[];
  rows: Array<Record<string, string | number | boolean | null | Record<string, string | number | boolean | null>>>;
}

export interface FieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // For choice type
  placeholder?: string;
  section?: string; // For grouping fields into sections
  maxLength?: number; // For text/number fields - max character/digit count
  subFields?: SubField[]; // For compound type - multiple sub-inputs
  startYear?: number; // For yearlyBatches type - starting year
  batches?: string[]; // For selectableBatches type - available batches defined by admin
  yearsCount?: number; // For quarterlyInvestigations type - number of years to show (default 4)
  columns?: TableColumn[]; // For customTable type - table columns definition
  // Optional row template for table-like fields (e.g. months of year)
  rowTemplate?: 'monthsOfYear';
}

export interface Notebook {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  fields: FieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

// User info for entry attribution
export interface EntryUserInfo {
  userId: string;
  username: string;
  displayName: string;
}

// Typed entry data value
export type EntryDataValue = 
  | string 
  | number 
  | boolean 
  | null
  | Record<string, string | number | boolean | null>
  | Record<number, string | Record<string, string>>
  | Array<Record<string, string>>;

// Entry data record with typed values
export type EntryData = Record<string, EntryDataValue>;

export interface NotebookEntry {
  id: string;
  notebook_id: string; // 👈 ضفنا ده عشان يطابق الباك إند
  notebookId?: string; // بنسيب ده احتياطي عشان لو مستخدم في مكان تاني
  creator_name?: string;
  data: EntryData;
  
  // 👇 التواريخ كما تأتي من لارافيل
  created_at: string;
  updated_at: string;
  
  // 👇 ده عشان التوافق مع الكود القديم لو موجود
  createdAt?: string;
  
  // 👇 الشخص اللي سجل (العلاقة اللي جاية من لارافيل)
  creator?: {
    id: string | number;
    display_name: string;
  };

  // 👇 القديم (سيبه احتياطي)
  createdBy?: EntryUserInfo;
  updatedBy?: EntryUserInfo;
}

export interface RegisteredUser {
  id: string;
  username: string;
  password?: string;
  displayName: string;
  createdAt: string;
  role: 'admin' | 'user';
  permissions: UserPermission[];
}

export type UserPermission = 
  | 'create_notebooks'      // إنشاء دفاتر
  | 'edit_notebooks'        // تعديل دفاتر
  | 'delete_notebooks'      // حذف دفاتر
  | 'import_data'           // استيراد بيانات
  | 'export_data'           // تصدير بيانات
  | 'manage_users'          // إدارة المستخدمين
  | 'edit_entries'          // تعديل السجلات
  | 'delete_entries'        // حذف السجلات
  | 'view_audit';           // عرض سجل التتبع
