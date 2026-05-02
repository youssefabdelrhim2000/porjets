// ============================================
// SelectableBatchesField Component
// Select a batch and enter data
// ============================================

import React from 'react';
import { Input } from '@/components/ui/input';
import type { FieldDefinition } from '@/types/notebook';
import type { SelectableBatchesValue } from '@/types/form';

interface SelectableBatchesFieldProps {
  field: FieldDefinition;
  value: SelectableBatchesValue;
  onChange: (value: SelectableBatchesValue) => void;
  error?: string;
}

export const SelectableBatchesField: React.FC<SelectableBatchesFieldProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const selectableValue = typeof value === 'object' && value !== null 
    ? value as SelectableBatchesValue 
    : { batch: '', data: '' };
  const availableBatches = field.batches || [];

  const handleBatchSelect = (batch: string) => {
    onChange({ ...selectableValue, batch });
  };

  const handleDataChange = (data: string) => {
    onChange({ ...selectableValue, data });
  };

  return (
    <div className="space-y-3">
      {/* Batch Selection */}
      <div className="flex flex-wrap gap-2">
        {availableBatches.map(batch => (
          <button
            key={batch}
            type="button"
            onClick={() => handleBatchSelect(batch)}
            className={`px-4 py-2 rounded-lg border text-sm transition-all ${
              selectableValue.batch === batch
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'
            }`}
          >
            {batch}
          </button>
        ))}
      </div>
      
      {/* Data Input */}
      {selectableValue.batch && (
        <Input
          type="text"
          value={selectableValue.data || ''}
          onChange={(e) => handleDataChange(e.target.value)}
          placeholder={`بيانات ${selectableValue.batch}`}
          className="bg-input/50 border-border/50 text-right"
          dir="rtl"
        />
      )}
      
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
};
