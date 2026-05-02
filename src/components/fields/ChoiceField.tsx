// ============================================
// ChoiceField Component
// Single choice selection field
// ============================================

import React from 'react';
import type { FieldDefinition } from '@/types/notebook';

interface ChoiceFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const ChoiceField: React.FC<ChoiceFieldProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const options = field.options || [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`px-4 py-2 rounded-lg border text-sm transition-all ${
              value === option
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
};
