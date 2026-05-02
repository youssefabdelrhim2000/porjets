import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Notebook, NotebookEntry } from '@/types/notebook';
import { flattenCellData } from '@/utils/notebookHelpers';

export const useCopyEntryData = () => {
  const { toast } = useToast();

  const copyToClipboard = useCallback(async (entry: NotebookEntry, notebook: Notebook) => {
    try {
      // 1. Build a formatted string from the entry data
      const formattedText = notebook.fields
        .map((field) => {
          const rawValue = entry.data[field.id];
          
          // Ignore empty values to keep the copied text clean
          if (rawValue === undefined || rawValue === null || rawValue === '') {
            return null;
          }

          // Use the helper to convert complex objects/arrays to string
          const stringValue = typeof rawValue === 'object' 
            ? flattenCellData(rawValue) 
            : String(rawValue);

          // Format: "Field Name: Value"
          return `${field.name}: ${stringValue}`;
        })
        .filter(Boolean) // Remove nulls
        .join('\n'); // Join with a new line

      // 2. Check if there's actually data to copy
      if (!formattedText) {
        toast({ 
          title: "تنبيه", 
          description: "السجل ده مفيهوش بيانات تتنسخ.", 
          variant: "destructive" 
        });
        return;
      }

      // 3. Write to the browser's clipboard
      await navigator.clipboard.writeText(formattedText);

      // 4. Success feedback
      toast({ 
        title: "تم النسخ بنجاح", 
        description: "تقدر دلوقتي تعمل لصق (Paste) للبيانات في أي مكان." 
      });

    } catch (error) {
      console.error('Failed to copy text: ', error);
      toast({ 
        title: "خطأ", 
        description: "حصلت مشكلة ومش قادرين ننسخ البيانات.", 
        variant: "destructive" 
      });
    }
  }, [toast]);

  return { copyToClipboard };
};