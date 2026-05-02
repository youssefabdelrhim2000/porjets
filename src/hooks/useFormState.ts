// ============================================
// useFormState Hook
// Manages form state with type safety
// ============================================

import { useState, useCallback } from 'react';
import type { FormData, FieldValue, ValidationResult } from '@/types/form';
import type { FieldDefinition } from '@/types/notebook';

interface UseFormStateOptions {
  initialData?: FormData;
  fields: FieldDefinition[];
  onSubmit?: (data: FormData) => void;
}

interface UseFormStateReturn {
  formData: FormData;
  errors: Record<string, string>;
  isSubmitting: boolean;
  handleFieldChange: (fieldId: string, value: FieldValue) => void;
  handleSubmit: () => ValidationResult;
  resetForm: () => void;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

export function useFormState({
  initialData = {},
  fields,
  onSubmit,
}: UseFormStateOptions): UseFormStateReturn {
  const [formData, setFormData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange = useCallback((fieldId: string, value: FieldValue) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    // Clear error when field is changed
    setErrors(prev => {
      if (prev[fieldId]) {
        const { [fieldId]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  const validate = useCallback((): ValidationResult => {
    const newErrors: Record<string, string> = {};
    
    fields.forEach(field => {
      if (field.required) {
        const value = formData[field.id];
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors[field.id] = `${field.name} مطلوب`;
        }
      }
    });

    const isValid = Object.keys(newErrors).length === 0;
    setErrors(newErrors);
    
    return { isValid, errors: newErrors };
  }, [fields, formData]);

  const handleSubmit = useCallback((): ValidationResult => {
    const result = validate();
    
    if (result.isValid && onSubmit) {
      setIsSubmitting(true);
      try {
        onSubmit(formData);
      } finally {
        setIsSubmitting(false);
      }
    }
    
    return result;
  }, [validate, onSubmit, formData]);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setErrors({});
  }, [initialData]);

  return {
    formData,
    errors,
    isSubmitting,
    handleFieldChange,
    handleSubmit,
    resetForm,
    setFormData,
  };
}
