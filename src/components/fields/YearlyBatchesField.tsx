// ============================================
// YearlyBatchesField Component
// Data input for multiple years
// ============================================

import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { FieldDefinition } from '@/types/notebook';
import type { YearlyBatchesValue } from '@/types/form';

interface YearlyBatchesFieldProps {
  field: FieldDefinition;
  value: YearlyBatchesValue;
  onChange: (value: YearlyBatchesValue) => void;
  error?: string;
}

export const YearlyBatchesField: React.FC<YearlyBatchesFieldProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const batchesValue = typeof value === 'object' && value !== null ? value : {};
  const startYear = field.startYear || 2023;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i);

  const handleYearChange = (year: number, yearValue: string) => {
    onChange({
      ...batchesValue,
      [year]: yearValue,
    });
  };

  return (
    <div className="space-y-2">
      {years.map(year => (
        <div key={year} className="flex items-center gap-3">
          <Badge variant="secondary" className="min-w-[60px] justify-center">{year}</Badge>
          <Input
            type="text"
            value={batchesValue[year] || ''}
            onChange={(e) => handleYearChange(year, e.target.value)}
            placeholder={`بيانات ${year}`}
            className="bg-input/50 border-border/50 text-right flex-1"
            dir="rtl"
          />
        </div>
      ))}
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
};
