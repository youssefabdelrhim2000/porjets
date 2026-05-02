// ============================================
// ImageField Component
// Image upload field with preview
// ============================================

import React from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useImageUpload } from '@/hooks/useImageUpload';
import type { FieldDefinition } from '@/types/notebook';

interface ImageFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const ImageField: React.FC<ImageFieldProps> = ({
  field,
  value,
  onChange,
  error: externalError,
}) => {
  const { isUploading, error: uploadError, uploadImage } = useImageUpload({
    onUpload: onChange,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadImage(file);
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const error = externalError || uploadError;

  return (
    <div className="space-y-2">
      {value && (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border/50">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1 right-1 p-1 bg-accent text-accent-foreground rounded-full hover:bg-accent/80 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <Input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className={`bg-input/50 border-border/50 ${error ? 'border-accent' : ''}`}
        disabled={isUploading}
      />
      {isUploading && (
        <p className="text-xs text-muted-foreground">جاري الرفع...</p>
      )}
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
};
