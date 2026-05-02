import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // بنعمل تايمر يستنى الملي ثواني اللي حددناها
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // لو اليوزر كتب حرف جديد قبل ما التايمر يخلص، بنكنسل التايمر القديم ونبدأ من جديد
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}