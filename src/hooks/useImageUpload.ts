// ============================================
// useImageUpload Hook
// Handles image file upload with validation
// ============================================

import { useCallback, useState } from 'react';

interface UseImageUploadOptions {
  maxSizeKB?: number;
  acceptedTypes?: string[];
  onUpload?: (base64: string) => void;
  onError?: (error: string) => void;
}

interface UseImageUploadReturn {
  isUploading: boolean;
  error: string | null;
  uploadImage: (file: File) => Promise<string | null>;
  clearError: () => void;
}

export function useImageUpload({
  maxSizeKB = 5120, // 5MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  onUpload,
  onError,
}: UseImageUploadOptions = {}): UseImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    setError(null);

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      const errorMsg = 'نوع الملف غير مدعوم. الأنواع المدعومة: JPEG, PNG, GIF, WebP';
      setError(errorMsg);
      onError?.(errorMsg);
      return null;
    }

    // Validate file size
    const fileSizeKB = file.size / 1024;
    if (fileSizeKB > maxSizeKB) {
      const errorMsg = `حجم الملف يتجاوز الحد المسموح (${Math.round(maxSizeKB / 1024)} MB)`;
      setError(errorMsg);
      onError?.(errorMsg);
      return null;
    }

    setIsUploading(true);

    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setIsUploading(false);
        onUpload?.(base64);
        resolve(base64);
      };

      reader.onerror = () => {
        const errorMsg = 'حدث خطأ أثناء قراءة الملف';
        setError(errorMsg);
        setIsUploading(false);
        onError?.(errorMsg);
        resolve(null);
      };

      reader.readAsDataURL(file);
    });
  }, [maxSizeKB, acceptedTypes, onUpload, onError]);

  return {
    isUploading,
    error,
    uploadImage,
    clearError,
  };
}
