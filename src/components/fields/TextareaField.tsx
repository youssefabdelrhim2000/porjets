// ============================================
// TextareaField Component
// Multi-line text input field
// ============================================

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import type { FieldDefinition } from '@/types/notebook';

interface TextareaFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  return (
    <div className="space-y-1">
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || `أدخل ${field.name}`}
        className={`bg-input/50 border-border/50 text-right resize-none ${error ? 'border-accent' : ''}`}
        dir="rtl"
        rows={3}
      />
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
};
