// ============================================
// TextField Component
// Basic text input field
// ============================================

import React from 'react';
import { Input } from '@/components/ui/input';
import type { FieldDefinition } from '@/types/notebook';

interface TextFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (field.maxLength && newValue.length > field.maxLength) return;
    onChange(newValue);
  };

  return (
    <div className="space-y-1">
      <Input
        type="text"
        value={value || ''}
        onChange={handleChange}
        placeholder={field.placeholder || `أدخل ${field.name}${field.maxLength ? ` (${field.maxLength} حرف)` : ''}`}
        className={`bg-input/50 border-border/50 text-right ${error ? 'border-accent' : ''}`}
        dir="rtl"
        maxLength={field.maxLength}
      />
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
};
