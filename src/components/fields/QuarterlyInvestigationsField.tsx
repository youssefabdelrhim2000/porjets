// ============================================
// QuarterlyInvestigationsField Component
// Quarterly data input for multiple years
// ============================================

import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { FieldDefinition } from '@/types/notebook';
import type { QuarterlyInvestigationsValue } from '@/types/form';
import { QUARTERS } from '@/types/form';

interface QuarterlyInvestigationsFieldProps {
  field: FieldDefinition;
  value: QuarterlyInvestigationsValue;
  onChange: (value: QuarterlyInvestigationsValue) => void;
  error?: string;
}

export const QuarterlyInvestigationsField: React.FC<QuarterlyInvestigationsFieldProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const quarterlyValue = typeof value === 'object' && value !== null ? value : {};
  const startYear = field.startYear || 2023;
  const yearsCount = field.yearsCount || 4;
  const years = Array.from({ length: yearsCount }, (_, i) => startYear + i);

  const handleQuarterChange = (year: number, quarter: string, quarterValue: string) => {
    const yearData = quarterlyValue[year] || {};
    onChange({
      ...quarterlyValue,
      [year]: {
        ...yearData,
        [quarter]: quarterValue,
      },
    });
  };

  return (
    <div className="space-y-4">
      {years.map(year => (
        <div key={year} className="p-3 bg-secondary/20 rounded-lg border border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="font-bold">{year}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUARTERS.map(q => {
              const yearData = quarterlyValue[year] || {};
              return (
                <div key={q.key} className="space-y-1">
                  <label className="text-xs text-muted-foreground block">{q.label}</label>
                  <Input
                    type="text"
                    value={yearData[q.key] || ''}
                    onChange={(e) => handleQuarterChange(year, q.key, e.target.value)}
                    placeholder={q.month}
                    className="bg-input/50 border-border/50 text-right text-sm h-9"
                    dir="rtl"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
};
