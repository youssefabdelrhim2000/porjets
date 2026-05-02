import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Edit2, Folder, Printer, Copy, Trash2, User } from 'lucide-react';
import type { Notebook, NotebookEntry, FieldDefinition } from '@/types/notebook';
import { FIELD_TYPE_ICONS } from '@/utils/notebookHelpers';
import { useCopyEntryData } from '@/hooks/useCopyEntryData';

interface EntryCardProps {
  entry: NotebookEntry;
  notebook: Notebook;
  isExpanded: boolean;
  isAdmin: boolean;
  onToggle: () => void;
  onPrint: (entry: NotebookEntry) => void;
  onEdit: (entry: NotebookEntry) => void;
  onDelete: (id: string) => void;
  renderFieldValue: (field: FieldDefinition, value: any) => React.ReactNode;
}

export const NotebookEntryCard = memo(({ 
  entry, notebook, isExpanded, isAdmin, 
  onToggle, onPrint, onEdit, onDelete, renderFieldValue 
}: EntryCardProps) => {

  const { copyToClipboard } = useCopyEntryData();
  
  const getDisplayName = () => {
    const data = entry.data || {};
    const nameField = notebook.fields.find((f: any) => ['الاسم', 'اسم', 'name'].some(k => f.name.includes(k)) && (f.type === 'text' || f.type === 'compound'));
    if (nameField) {
      const v = data[nameField.id];
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (typeof v === 'object' && v !== null && nameField.subFields) {
        return nameField.subFields.map((sf: any) => v[sf.id]).filter(Boolean).join(' ');
      }
    }
    const firstText = notebook.fields.find((f: any) => ['text', 'textarea'].includes(f.type));
    if (firstText && data[firstText.id]) return String(data[firstText.id]).trim();
    return 'سجل بدون اسم';
  };

  const getImageUrl = () => {
    const imageField = notebook.fields.find((f: any) => f.type === 'image');
    if (!imageField) return null;
    const v = entry.data?.[imageField.id];
    return typeof v === 'string' && v ? v : null;
  };

  const displayName = getDisplayName();
  const imageUrl = getImageUrl();
  // دالة النسخ الشاملة
  const handleCopyAll = async (e: React.MouseEvent) => {
    e.stopPropagation(); // عشان الكارت مايفتحش ويقفل وإنت بتنسخ
    
    // بنلف على كل الحقول بتاعة الدفتر ونجيب قيمتها من السجل
    const details = notebook.fields.map(field => {
      const value = entry.data[field.id];
      // لو الحقل فاضي بنحط شرطة، لو مليان بنجيب قيمته
      const displayValue = value ? (typeof value === 'object' ? JSON.stringify(value) : value) : '—';
      return `▪ ${field.name}: ${displayValue}`;
    }).join('\n');

    // تجميعة النص النهائي
    const finalCopiedText = `--- بيانات السجل ---\n${details}`;

    try {
      await navigator.clipboard.writeText(finalCopiedText);
      alert('تم نسخ جميع بيانات السجل بنجاح! 📋'); // أو استخدم toast لو شغال بيها
    } catch (err) {
      alert('حصلت مشكلة في النسخ!');
    }
  };
  return (
    <div className="bg-card/50 rounded-2xl border border-border/30 hover:border-primary/30 transition-colors overflow-hidden mb-2">
      <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={onToggle}>
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" className="w-12 h-12 object-cover rounded-lg border border-border/50 flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-primary" />
          </div>
        )}
        <span className="flex-1 text-right font-medium text-foreground">{displayName}</span>
        <div className="flex items-center gap-2">
          <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" 
              // onClick={(e) => { 
              //   e.stopPropagation(); // 🚀 دي مهمة جداً عشان الكارت ما يفتحش ويقفل لما تدوس نسخ
              //   copyToClipboard(entry, notebook); 
              // }}
              onClick={handleCopyAll}
              title="نسخ البيانات"
            >
                <Copy className="w-4 h-4 text-muted-foreground" />
          </Button>
          {isAdmin && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onPrint(entry); }}>
                <Printer className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(entry); }}>
                <Edit2 className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}>
                <Trash2 className="w-4 h-4 text-accent" />
              </Button>
            </>
          )}
          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border/30 p-4 lg:p-6 space-y-4" dir="rtl">
          {imageUrl && (
            <div className="flex justify-center sm:justify-start mb-4">
              <img src={imageUrl} alt={displayName} loading="lazy" className="w-32 h-32 object-cover rounded-xl border border-border/50 shadow-sm" />
            </div>
          )}
          <div className="space-y-4">
            {(() => {
              const sections = [...new Set(notebook.fields.map((f: any) => f.section || 'بيانات أساسية'))];
              return sections.map(section => {
                const sectionFields = notebook.fields.filter((f: any) => (f.section || 'بيانات أساسية') === section);
                if (sectionFields.length === 0) return null;
                return (
                  <div key={section as string} className="space-y-2">
                    {sections.length > 1 && (
                      <div className="text-xs text-primary font-medium flex items-center gap-1 pb-1 border-b border-border/30">
                        <Folder className="w-3 h-3" />{section as string}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sectionFields.map((field: any) => {
                        const FieldIcon = FIELD_TYPE_ICONS[field.type] || Type;
                        return (
                          <div key={field.id} className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <FieldIcon className="w-3 h-3" />{field.name}
                            </div>
                            <div className="text-foreground">
                              {renderFieldValue(field, entry.data[field.id])}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          <div className="pt-4 border-t border-border/30 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {isAdmin && entry.creator_name && (
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-lg">
                <User className="w-3 h-3" /><span>أضافه: {entry.creator_name}</span>
              </div>
          
            )}
            <span>إنشاء: {new Date(entry.created_at || entry.createdAt!).toLocaleDateString('ar-EG')}</span>
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => prev.isExpanded === next.isExpanded && prev.entry.id === next.entry.id && prev.entry.updated_at === next.entry.updated_at);