// ============================================
// CompoundField Component
// Multiple sub-fields in one field
// ============================================

import React from 'react';
import { Input } from '@/components/ui/input';
import type { FieldDefinition } from '@/types/notebook';
import type { CompoundFieldValue } from '@/types/form';

interface CompoundFieldProps {
  field: FieldDefinition;
  value: CompoundFieldValue;
  onChange: (value: CompoundFieldValue) => void;
  error?: string;
}

export const CompoundField: React.FC<CompoundFieldProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const compoundValue = typeof value === 'object' && value !== null ? value : {};
  const subFields = field.subFields || [];

  const handleSubFieldChange = (subFieldId: string, subValue: string) => {
    onChange({
      ...compoundValue,
      [subFieldId]: subValue,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {subFields.map(subField => (
          <div key={subField.id} className="flex-1 min-w-[120px]">
            <Input
              type="text"
              value={compoundValue[subField.id] || ''}
              onChange={(e) => handleSubFieldChange(subField.id, e.target.value)}
              placeholder={subField.placeholder || subField.name}
              className="bg-input/50 border-border/50 text-right text-sm"
              dir="rtl"
            />
            <span className="text-xs text-muted-foreground mt-1 block">{subField.name}</span>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
};
