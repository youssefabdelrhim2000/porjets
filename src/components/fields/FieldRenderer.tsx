// ============================================
// FieldRenderer Component
// Renders appropriate field component based on type
// ============================================

import React from 'react';
import { Label } from '@/components/ui/label';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { TextareaField } from './TextareaField';
import { DateField } from './DateField';
import { ImageField } from './ImageField';
import { ChoiceField } from './ChoiceField';
import { CompoundField } from './CompoundField';
import { YearlyBatchesField } from './YearlyBatchesField';
import { SelectableBatchesField } from './SelectableBatchesField';
import { QuarterlyInvestigationsField } from './QuarterlyInvestigationsField';
import { CustomTableField } from './CustomTableField';
import { MonthlyDataField } from './MonthlyDataField';
import { FIELD_TYPE_ICONS } from '@/lib/constants';
import type { FieldDefinition } from '@/types/notebook';
import type { FieldValue, MonthlyDataValue } from '@/types/form';

interface FieldRendererProps {
  field: FieldDefinition;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  error?: string;
  showLabel?: boolean;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
  showLabel = true,
}) => {
  const IconComponent = FIELD_TYPE_ICONS[field.type];

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return <TextField field={field} value={value as string} onChange={onChange} error={error} />;
      
      case 'number':
        return <NumberField field={field} value={value as string} onChange={onChange} error={error} />;
      
      case 'textarea':
        return <TextareaField field={field} value={value as string} onChange={onChange} error={error} />;
      
      case 'date':
        return <DateField field={field} value={value as string} onChange={onChange} error={error} />;
      
      case 'image':
        return <ImageField field={field} value={value as string} onChange={onChange} error={error} />;
      
      case 'choice':
        return <ChoiceField field={field} value={value as string} onChange={onChange} error={error} />;
      
      case 'compound':
        return <CompoundField field={field} value={value as Record<string, string>} onChange={onChange} error={error} />;
      
      case 'yearlyBatches':
        return <YearlyBatchesField field={field} value={value as Record<number, string>} onChange={onChange} error={error} />;
      
      case 'selectableBatches':
        return <SelectableBatchesField field={field} value={value as { batch: string; data: string }} onChange={onChange} error={error} />;
      
      case 'quarterlyInvestigations':
        return <QuarterlyInvestigationsField field={field} value={value as Record<number, Record<string, string>>} onChange={onChange} error={error} />;
      
      case 'customTable':
        return <CustomTableField field={field} value={value as Array<Record<string, string>>} onChange={onChange} error={error} />;
      
      case 'monthlyData':
        return <MonthlyDataField field={field} value={value as MonthlyDataValue} onChange={onChange} error={error} />;
      
      default:
        return <TextField field={field} value={value as string} onChange={onChange} error={error} />;
    }
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label className="text-foreground flex items-center gap-2 text-sm font-medium">
          {IconComponent && <IconComponent className="w-4 h-4 text-primary" />}
          {field.name}
          {field.required && <span className="text-accent">*</span>}
        </Label>
      )}
      {renderField()}
    </div>
  );
};
