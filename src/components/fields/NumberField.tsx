// ============================================
// NumberField Component
// Numeric input field with validation
// ============================================

import React from 'react';
import { Input } from '@/components/ui/input';
import type { FieldDefinition } from '@/types/notebook';

interface NumberFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/\D/g, '');
    if (field.maxLength && newValue.length > field.maxLength) return;
    onChange(newValue);
  };

  return (
    <div className="space-y-1">
      <Input
        type="text"
        inputMode="numeric"
        value={value || ''}
        onChange={handleChange}
        placeholder={field.placeholder || `أدخل ${field.name}${field.maxLength ? ` (${field.maxLength} رقم)` : ''}`}
        className={`bg-input/50 border-border/50 text-right ${error ? 'border-accent' : ''}`}
        dir="rtl"
        maxLength={field.maxLength}
      />
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
};
