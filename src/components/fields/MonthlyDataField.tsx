// ============================================
// MonthlyDataField Component
// Data input for all 12 months of the year
// ============================================

import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { FieldDefinition } from '@/types/notebook';
import type { MonthlyDataValue } from '@/types/form';

interface MonthlyDataFieldProps {
  field: FieldDefinition;
  value: MonthlyDataValue;
  onChange: (value: MonthlyDataValue) => void;
  error?: string;
}

const MONTHS = [
  { key: 1, name: 'يناير', nameEn: 'January' },
  { key: 2, name: 'فبراير', nameEn: 'February' },
  { key: 3, name: 'مارس', nameEn: 'March' },
  { key: 4, name: 'أبريل', nameEn: 'April' },
  { key: 5, name: 'مايو', nameEn: 'May' },
  { key: 6, name: 'يونيو', nameEn: 'June' },
  { key: 7, name: 'يوليو', nameEn: 'July' },
  { key: 8, name: 'أغسطس', nameEn: 'August' },
  { key: 9, name: 'سبتمبر', nameEn: 'September' },
  { key: 10, name: 'أكتوبر', nameEn: 'October' },
  { key: 11, name: 'نوفمبر', nameEn: 'November' },
  { key: 12, name: 'ديسمبر', nameEn: 'December' },
];

export const MonthlyDataField: React.FC<MonthlyDataFieldProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const monthlyValue = typeof value === 'object' && value !== null ? value : {};

  const handleMonthChange = (month: number, monthValue: string) => {
    onChange({
      ...monthlyValue,
      [month]: monthValue,
    });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {MONTHS.map(month => (
          <div key={month.key} className="flex items-center gap-2">
            <Badge variant="secondary" className="min-w-[70px] justify-center text-xs">
              {month.name}
            </Badge>
            <Input
              type="text"
              value={monthlyValue[month.key] || ''}
              onChange={(e) => handleMonthChange(month.key, e.target.value)}
              placeholder={`بيانات ${month.name}`}
              className="bg-input/50 border-border/50 text-right flex-1 h-9"
              dir="rtl"
            />
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
};
