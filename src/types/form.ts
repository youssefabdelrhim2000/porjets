// ============================================
// Form-Related Type Definitions
// Strict types for form handling
// ============================================

import type { FieldDefinition, FieldType } from './notebook';

// Generic form field value types
export type TextFieldValue = string;
export type NumberFieldValue = string; // Stored as string for input handling
export type DateFieldValue = string;
export type ImageFieldValue = string; // Base64 or URL
export type ChoiceFieldValue = string;

export interface CompoundFieldValue {
  [subFieldId: string]: string;
}

export interface YearlyBatchesValue {
  [year: number]: string;
}

export interface MonthlyDataValue {
  [month: number]: string;
}

export interface SelectableBatchesValue {
  batch: string;
  data: string;
}

export interface QuarterlyInvestigationsValue {
  [year: number]: {
    q1?: string;
    q4?: string;
    q7?: string;
    q10?: string;
  };
}

export interface TableRowValue {
  [columnId: string]: string;
}

export type CustomTableValue = TableRowValue[];

// Union type for all possible field values
export type FieldValue =
  | TextFieldValue
  | NumberFieldValue
  | DateFieldValue
  | ImageFieldValue
  | ChoiceFieldValue
  | CompoundFieldValue
  | YearlyBatchesValue
  | MonthlyDataValue
  | SelectableBatchesValue
  | QuarterlyInvestigationsValue
  | CustomTableValue;

// Form data structure
export type FormData = Record<string, FieldValue>;

// Field change handler type
export type FieldChangeHandler = (fieldId: string, value: FieldValue) => void;

// Form validation result
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Field render props
export interface FieldRenderProps {
  field: FieldDefinition;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  error?: string;
}

// Quarters configuration
export interface QuarterConfig {
  key: 'q1' | 'q4' | 'q7' | 'q10';
  label: string;
  month: string;
}

export const QUARTERS: QuarterConfig[] = [
  { key: 'q1', label: 'شهر 1', month: 'يناير' },
  { key: 'q4', label: 'شهر 4', month: 'أبريل' },
  { key: 'q7', label: 'شهر 7', month: 'يوليو' },
  { key: 'q10', label: 'شهر 10', month: 'أكتوبر' },
];
