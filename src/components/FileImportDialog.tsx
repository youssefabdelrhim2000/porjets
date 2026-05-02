import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, FileSpreadsheet, FileText, File, 
  Check, AlertCircle, Loader2, X, Download
} from 'lucide-react';
import type { Notebook, NotebookEntry } from '@/types/notebook';
import { saveEntry } from '@/lib/storage';

interface FileImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebook: Notebook;
  userId: string;
  userInfo: {
    userId: string;
    username: string;
    displayName: string;
  };
  onSuccess: () => void;
}

interface ParsedRow {
  data: Record<string, any>;
  isValid: boolean;
  errors: string[];
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

const FileImportDialog: React.FC<FileImportDialogProps> = ({
  open,
  onOpenChange,
  notebook,
  userId,
  userInfo,
  onSuccess,
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setProgress(0);
    setError('');
    setImportedCount(0);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const parseExcel = async (file: File): Promise<Record<string, any>[]> => {
    const XLSX = await import('xlsx');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (err) {
          reject(new Error('فشل في قراءة ملف Excel'));
        }
      };
      reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseWord = async (file: File): Promise<Record<string, any>[]> => {
    // For Word files, we'll try to extract table data or convert to simple format
    // This is a simplified implementation
    const mammoth = await import('mammoth');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          const lines = result.value.split('\n').filter(line => line.trim());
          
          // Try to parse as tab-separated or line-by-line data
          const data: Record<string, any>[] = [];
          const fields = notebook.fields.filter(f => f.type !== 'image' && f.type !== 'yearlyBatches' && f.type !== 'compound');
          
          lines.forEach((line, index) => {
            if (index === 0) return; // Skip header
            const values = line.split('\t').length > 1 ? line.split('\t') : [line];
            const row: Record<string, any> = {};
            fields.forEach((field, i) => {
              if (values[i]) {
                row[field.name] = values[i].trim();
              }
            });
            if (Object.keys(row).length > 0) {
              data.push(row);
            }
          });
          
          resolve(data);
        } catch (err) {
          reject(new Error('فشل في قراءة ملف Word'));
        }
      };
      reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parsePDF = async (file: File): Promise<Record<string, any>[]> => {
    // PDF parsing is complex - we'll provide basic text extraction
    // For Laravel integration later, this would be handled server-side
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker path
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          
          const data: Record<string, any>[] = [];
          const fields = notebook.fields.filter(f => f.type !== 'image' && f.type !== 'yearlyBatches' && f.type !== 'compound');
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const text = textContent.items.map((item: any) => item.str).join(' ');
            
            // Simple line-based parsing
            const lines = text.split(/\s{2,}/).filter(line => line.trim());
            lines.forEach(line => {
              const row: Record<string, any> = {};
              // Try to match field names in the text
              fields.forEach(field => {
                const regex = new RegExp(`${field.name}[:\\s]+([^\\n]+)`, 'i');
                const match = line.match(regex);
                if (match) {
                  row[field.name] = match[1].trim();
                }
              });
              if (Object.keys(row).length > 0) {
                data.push(row);
              }
            });
          }
          
          resolve(data);
        } catch (err) {
          reject(new Error('فشل في قراءة ملف PDF - يُفضل استخدام Excel للاستيراد'));
        }
      };
      reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
      reader.readAsArrayBuffer(file);
    });
  };

  const mapRowToFields = (row: Record<string, any>): ParsedRow => {
    const data: Record<string, any> = {};
    const errors: string[] = [];

    notebook.fields.forEach(field => {
      // Try to find matching value by field name (Arabic or English)
      const value = row[field.name] || row[field.id] || '';
      
      if (field.type === 'number' && value) {
        const numericValue = String(value).replace(/\D/g, '');
        if (field.maxLength && numericValue.length > field.maxLength) {
          errors.push(`${field.name}: تجاوز الحد الأقصى (${field.maxLength} رقم)`);
        }
        data[field.id] = numericValue;
      } else if (field.type === 'choice' && value) {
        if (field.options?.includes(String(value))) {
          data[field.id] = value;
        } else {
          errors.push(`${field.name}: قيمة غير صالحة`);
        }
      } else {
        data[field.id] = value;
      }

      if (field.required && !data[field.id]) {
        errors.push(`${field.name}: حقل مطلوب`);
      }
    });

    return {
      data,
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError('');
    
    try {
      let rawData: Record<string, any>[] = [];
      
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (ext === 'xlsx' || ext === 'xls') {
        rawData = await parseExcel(selectedFile);
      } else if (ext === 'docx' || ext === 'doc') {
        rawData = await parseWord(selectedFile);
      } else if (ext === 'pdf') {
        rawData = await parsePDF(selectedFile);
      } else {
        throw new Error('صيغة الملف غير مدعومة');
      }

      if (rawData.length === 0) {
        throw new Error('لم يتم العثور على بيانات في الملف');
      }

      const parsed = rawData.map(row => mapRowToFields(row));
      setParsedData(parsed);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'خطأ في معالجة الملف');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleImport = async () => {
    setStep('importing');
    const validRows = parsedData.filter(row => row.isValid);
    let imported = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const entry: NotebookEntry = {
        id: crypto.randomUUID(),
        notebookId: notebook.id,
        data: row.data,
        createdBy: userInfo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      saveEntry(entry);
      imported++;
      setProgress(Math.round((imported / validRows.length) * 100));
      
      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setImportedCount(imported);
    setStep('complete');
  };

  const generateTemplate = async () => {
    const XLSX = await import('xlsx');
    const headers = notebook.fields
      .filter(f => f.type !== 'image' && f.type !== 'yearlyBatches' && f.type !== 'compound')
      .map(f => f.name);
    
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${notebook.name}_template.xlsx`);
  };

  const getFileIcon = (fileName?: string) => {
    if (!fileName) return <Upload className="w-12 h-12 text-muted-foreground" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet className="w-12 h-12 text-primary" />;
    if (ext === 'docx' || ext === 'doc') return <FileText className="w-12 h-12 text-primary" />;
    if (ext === 'pdf') return <File className="w-12 h-12 text-accent" />;
    return <File className="w-12 h-12 text-muted-foreground" />;
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden bg-card border-border" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            استيراد بيانات
          </DialogTitle>
          <DialogDescription>
            استيراد سجلات من ملفات Excel أو Word أو PDF إلى دفتر "{notebook.name}"
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center transition-all
                ${isDragging ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50'}
              `}
            >
              <div className="flex flex-col items-center gap-4">
                {getFileIcon(file?.name)}
                <div>
                  <p className="text-foreground font-medium mb-1">
                    اسحب الملف هنا أو اضغط للاختيار
                  </p>
                  <p className="text-sm text-muted-foreground">
                    يدعم: Excel (.xlsx, .xls) • Word (.docx) • PDF
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.docx,.doc,.pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg text-accent text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Template Download */}
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">تحميل قالب Excel</p>
                <p className="text-xs text-muted-foreground">قالب جاهز بأسماء الحقول</p>
              </div>
              <Button variant="outline" size="sm" onClick={generateTemplate}>
                <Download className="w-4 h-4 ml-2" />
                تحميل القالب
              </Button>
            </div>

            {/* Note about Laravel */}
            <p className="text-xs text-muted-foreground text-center">
              💡 للحصول على دقة أعلى في الاستيراد، استخدم Excel مع القالب المتوفر
            </p>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="flex gap-4">
              <div className="flex-1 p-4 bg-primary/10 border border-primary/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{validCount}</p>
                <p className="text-sm text-muted-foreground">سجل صالح</p>
              </div>
              <div className="flex-1 p-4 bg-accent/10 border border-accent/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-accent">{invalidCount}</p>
                <p className="text-sm text-muted-foreground">سجل به أخطاء</p>
              </div>
            </div>

            {/* Preview Table */}
            <ScrollArea className="h-[300px] border border-border/50 rounded-lg">
              <div className="p-4 space-y-2">
                {parsedData.map((row, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      row.isValid 
                        ? 'bg-secondary/30 border-border/30' 
                        : 'bg-accent/5 border-accent/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {row.isValid ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <X className="w-4 h-4 text-accent" />
                          )}
                          <span className="text-sm font-medium text-foreground">
                            سجل #{index + 1}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(row.data).slice(0, 3).map(([key, value]) => {
                            const field = notebook.fields.find(f => f.id === key);
                            return value ? (
                              <Badge key={key} variant="secondary" className="text-xs">
                                {field?.name || key}: {String(value).slice(0, 20)}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                        {row.errors.length > 0 && (
                          <div className="mt-2 text-xs text-accent">
                            {row.errors.join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={resetState}>
                اختيار ملف آخر
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0}
                style={{ 
                  background: validCount > 0 ? 'var(--gradient-gold)' : undefined,
                  boxShadow: validCount > 0 ? 'var(--shadow-gold)' : undefined
                }}
              >
                استيراد {validCount} سجل
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <div>
              <p className="text-lg font-medium text-foreground">جاري الاستيراد...</p>
              <p className="text-sm text-muted-foreground">يرجى الانتظار</p>
            </div>
            <Progress value={progress} className="w-full max-w-xs mx-auto" />
            <p className="text-sm text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">تم الاستيراد بنجاح!</p>
              <p className="text-sm text-muted-foreground">
                تم استيراد {importedCount} سجل إلى الدفتر
              </p>
            </div>
            <Button
              onClick={() => {
                handleClose();
                onSuccess();
              }}
              style={{ 
                background: 'var(--gradient-gold)',
                boxShadow: 'var(--shadow-gold)' 
              }}
            >
              تم
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FileImportDialog;
