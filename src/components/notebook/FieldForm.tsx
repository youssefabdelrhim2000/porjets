import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Check } from 'lucide-react';
import { FIELD_TYPES, generateId } from '@/constants/notebookFields';
import type { FieldDefinition, FieldType, SubField, TableColumn } from '@/types/notebook';

interface FieldFormProps {
  sections: string[];
  onAddField: (field: FieldDefinition) => void;
  onError: (msg: string) => void;
  editingField?: FieldDefinition | null;
  onCancelEdit?: () => void;
}

const FieldForm: React.FC<FieldFormProps> = ({ 
  sections, onAddField, onError, editingField, onCancelEdit 
}) => {
  const [newFieldName, setNewFieldName] = useState(editingField?.name || '');
  const [newFieldType, setNewFieldType] = useState<FieldType>(editingField?.type || 'text');
  const [newFieldRequired, setNewFieldRequired] = useState(editingField?.required || false);
  const [newFieldOptions, setNewFieldOptions] = useState(editingField?.options?.join(', ') || '');
  const [newFieldSection, setNewFieldSection] = useState(editingField?.section || sections[0] || '');
  const [newFieldMaxLength, setNewFieldMaxLength] = useState<number | ''>(editingField?.maxLength || '');
  const [newFieldSubFields, setNewFieldSubFields] = useState<SubField[]>(editingField?.subFields || []);
  const [newSubFieldName, setNewSubFieldName] = useState('');
  const [newFieldStartYear, setNewFieldStartYear] = useState(editingField?.startYear || 2023);
  const [newFieldBatches, setNewFieldBatches] = useState<string[]>(editingField?.batches || []);
  const [newBatchName, setNewBatchName] = useState('');
  const [newFieldYearsCount, setNewFieldYearsCount] = useState(editingField?.yearsCount || 4);
  const [newFieldColumns, setNewFieldColumns] = useState<TableColumn[]>(editingField?.columns || []);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<'text' | 'number' | 'date' | 'compound'>('text');
  const [newColumnSubColumns, setNewColumnSubColumns] = useState<TableColumn[]>([]);
  const [newTableSubColumnName, setNewTableSubColumnName] = useState('');
  const [newTableSubColumnType, setNewTableSubColumnType] = useState<'text' | 'number' | 'date'>('text');
  const [newColumnOptions, setNewColumnOptions] = useState('');
  const [newFieldRowTemplate, setNewFieldRowTemplate] = useState<'monthsOfYear' | null>(editingField?.rowTemplate || null);

  const handleSubmit = () => {
    if (!newFieldName.trim()) return onError('يرجى إدخال اسم الحقل');
    if (newFieldType === 'choice' && !newFieldOptions.trim()) return onError('يرجى إدخال الخيارات للاختيار');
    if (newFieldType === 'compound' && newFieldSubFields.length === 0) return onError('يرجى إضافة عنصر فرعي واحد على الأقل');
    if (newFieldType === 'selectableBatches' && newFieldBatches.length === 0) return onError('يرجى إضافة دفعة واحدة على الأقل');
    if ((newFieldType === 'customTable' || newFieldType === 'flexibleTable') && newFieldColumns.length === 0) return onError('يرجى إضافة عمود واحد على الأقل للجدول');

    const currentSection = newFieldSection || sections[0] || 'بيانات أساسية';

    const field: FieldDefinition = {
      id: editingField?.id || generateId(),
      name: newFieldName.trim(),
      type: newFieldType,
      required: newFieldRequired,
      section: currentSection,
      ...(newFieldType === 'choice' && { options: newFieldOptions.split(',').map(o => o.trim()).filter(Boolean) }),
      ...((newFieldType === 'text' || newFieldType === 'number') && newFieldMaxLength && { maxLength: Number(newFieldMaxLength) }),
      ...(newFieldType === 'compound' && { subFields: newFieldSubFields }),
      ...(newFieldType === 'yearlyBatches' && { startYear: newFieldStartYear }),
      ...(newFieldType === 'selectableBatches' && { batches: newFieldBatches }),
      ...(newFieldType === 'quarterlyInvestigations' && { startYear: newFieldStartYear, yearsCount: newFieldYearsCount }),
      ...((newFieldType === 'customTable' || newFieldType === 'flexibleTable') && {
        columns: newFieldColumns,
        ...(newFieldRowTemplate && { rowTemplate: newFieldRowTemplate }),
      }),
    };

    onAddField(field);
    onError('');
  };

  return (
    <div className={`p-4 rounded-xl border space-y-4 transition-all ${editingField ? 'bg-primary/5 border-primary/50 shadow-md' : 'bg-secondary/20 border-border/30'}`}>
      <div className="flex justify-between items-center">
        <Label className={`font-bold ${editingField ? 'text-primary' : 'text-foreground'}`}>
          {editingField ? 'تعديل بيانات الحقل' : 'إضافة حقل جديد'}
        </Label>
        {editingField && onCancelEdit && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit} className="h-6 text-xs">إلغاء التعديل</Button>
        )}
      </div>

      {/* Section */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">القسم</Label>
        <div className="flex flex-wrap gap-2">
          {sections.map(section => (
            <button key={section} type="button" onClick={() => setNewFieldSection(section)}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${(newFieldSection || sections[0]) === section ? 'border-primary bg-primary/20 text-primary' : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}>
              {section}
            </button>
          ))}
        </div>
      </div>

      {/* Field Name */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">اسم الحقل</Label>
        <Input value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="مثال: الاسم الكامل" className="bg-input/50 border-border/50 text-right" dir="rtl" maxLength={50} />
      </div>

      {/* Field Type */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">نوع الحقل</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FIELD_TYPES.map(type => (
            <button key={type.value} type="button" onClick={() => setNewFieldType(type.value)}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg border text-xs transition-all ${newFieldType === type.value ? 'border-primary bg-primary/20 text-primary' : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}>
              <type.icon className="w-4 h-4" />
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Max Length */}
      {(newFieldType === 'text' || newFieldType === 'number') && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">الحد الأقصى {newFieldType === 'number' ? 'للأرقام' : 'للحروف'} (اختياري)</Label>
          <Input type="number" value={newFieldMaxLength} onChange={(e) => setNewFieldMaxLength(e.target.value ? Number(e.target.value) : '')} className="bg-input/50 border-border/50 text-right" dir="rtl" min={1} max={500} />
        </div>
      )}

      {/* Choice */}
      {newFieldType === 'choice' && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">الخيارات (افصل بفاصلة)</Label>
          <Input value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} placeholder="خيار 1, خيار 2, خيار 3" className="bg-input/50 border-border/50 text-right" dir="rtl" />
        </div>
      )}

      {/* Compound */}
      {newFieldType === 'compound' && (
        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">العناصر الفرعية</Label>
          {newFieldSubFields.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {newFieldSubFields.map((sf, index) => (
                <div key={sf.id} className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded-lg text-xs">
                  <span className="text-primary">{sf.name}</span>
                  <button type="button" onClick={() => setNewFieldSubFields(newFieldSubFields.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-accent"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input value={newSubFieldName} onChange={(e) => setNewSubFieldName(e.target.value)} placeholder="اسم العنصر" className="bg-input/50 border-border/50 text-right flex-1" dir="rtl" maxLength={30} />
            <Button type="button" variant="outline" size="icon" onClick={() => { if (newSubFieldName.trim()) { setNewFieldSubFields([...newFieldSubFields, { id: generateId(), name: newSubFieldName.trim() }]); setNewSubFieldName(''); } }}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Yearly Batches */}
      {newFieldType === 'yearlyBatches' && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">سنة البداية</Label>
          <Input type="number" value={newFieldStartYear} onChange={(e) => setNewFieldStartYear(Number(e.target.value))} className="bg-input/50 border-border/50 text-right" dir="rtl" min={2000} max={new Date().getFullYear()} />
          <p className="text-xs text-muted-foreground">سيتم إنشاء حقول من {newFieldStartYear} حتى {new Date().getFullYear()}</p>
        </div>
      )}

      {/* Selectable Batches */}
      {newFieldType === 'selectableBatches' && (
        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">الدفعات المتاحة</Label>
          {newFieldBatches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {newFieldBatches.map((batch, index) => (
                <div key={index} className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded-lg text-xs">
                  <span className="text-primary">{batch}</span>
                  <button type="button" onClick={() => setNewFieldBatches(newFieldBatches.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-accent"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input value={newBatchName} onChange={(e) => setNewBatchName(e.target.value)} placeholder="اسم الدفعة" className="bg-input/50 border-border/50 text-right flex-1" dir="rtl" maxLength={30} />
            <Button type="button" variant="outline" size="icon" onClick={() => { if (newBatchName.trim() && !newFieldBatches.includes(newBatchName.trim())) { setNewFieldBatches([...newFieldBatches, newBatchName.trim()]); setNewBatchName(''); } }}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Quarterly Investigations */}
      {newFieldType === 'quarterlyInvestigations' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">سنة البداية</Label>
            <Input type="number" value={newFieldStartYear} onChange={(e) => setNewFieldStartYear(Number(e.target.value))} className="bg-input/50 border-border/50 text-right" dir="rtl" min={2000} max={new Date().getFullYear()} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">عدد السنوات</Label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map(count => (
                <button key={count} type="button" onClick={() => setNewFieldYearsCount(count)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-all ${newFieldYearsCount === count ? 'border-primary bg-primary/20 text-primary' : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}>
                  {count} سنوات
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 bg-secondary/30 rounded-lg border border-border/30">
            <p className="text-xs text-muted-foreground mb-2">سيتم إنشاء حقول للفترات التالية لكل سنة:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">شهر 1 (يناير)</Badge>
              <Badge variant="outline" className="text-xs">شهر 4 (أبريل)</Badge>
              <Badge variant="outline" className="text-xs">شهر 7 (يوليو)</Badge>
              <Badge variant="outline" className="text-xs">شهر 10 (أكتوبر)</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">الفترة: {newFieldStartYear} إلى {newFieldStartYear + newFieldYearsCount - 1}</p>
          </div>
        </div>
      )}

      {/* Custom/Flexible Table */}
      {(newFieldType === 'customTable' || newFieldType === 'flexibleTable') && (
        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground flex items-center justify-between">
            <span>أعمدة الجدول</span>
            <span className="text-[11px] text-muted-foreground">(إعدادات التصميم للأدمن فقط)</span>
          </Label>
          {newFieldColumns.length > 0 && (
            <div className="space-y-2">
              {newFieldColumns.map((col, index) => (
                <div key={col.id} className="flex items-center justify-between p-2 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-primary font-medium">{col.name}</span>
                    <Badge variant="secondary" className="text-xs">{col.type === 'text' ? 'نص' : col.type === 'number' ? 'رقم' : col.type === 'date' ? 'تاريخ' : 'مركب'}</Badge>
                    {col.options && col.options.length > 0 && <Badge variant="outline" className="text-[10px]">قائمة اختيار</Badge>}
                  </div>
                  <button type="button" onClick={() => setNewFieldColumns(newFieldColumns.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-accent"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">اسم العمود</Label>
                <Input value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="مثال: الاسم" className="bg-input/50 border-border/50 text-right" dir="rtl" maxLength={30} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">نوع العمود</Label>
                <div className="flex gap-1">
                  {(['text', 'number', 'date', 'compound'] as const).map(type => (
                    <button key={type} type="button" onClick={() => setNewColumnType(type)}
                      className={`px-3 py-2 rounded-lg border text-xs transition-all ${newColumnType === type ? 'border-primary bg-primary/20 text-primary' : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}>
                      {type === 'text' ? 'نص' : type === 'number' ? 'رقم' : type === 'date' ? 'تاريخ' : 'مركب'}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => {
                if (!newColumnName.trim()) return;
                if (newColumnType === 'compound' && newColumnSubColumns.length === 0) return onError('العمود المركب يتطلب عمودين فرعيين على الأقل');
                const parsedOptions = newColumnOptions.split(',').map(o => o.trim()).filter(Boolean);
                const baseColumn: TableColumn = {
                  id: generateId(), name: newColumnName.trim(), type: newColumnType,
                  ...(newColumnType === 'compound' && { subColumns: newColumnSubColumns }),
                  ...(newColumnType !== 'compound' && parsedOptions.length > 0 && { options: parsedOptions }),
                };
                setNewFieldColumns([...newFieldColumns, baseColumn]);
                setNewColumnName(''); setNewColumnSubColumns([]); setNewTableSubColumnName(''); setNewColumnOptions('');
              }}><Plus className="w-4 h-4" /></Button>
            </div>
            {newColumnType === 'compound' && (
              <div className="space-y-3 p-3 bg-secondary/20 rounded-lg border border-border/40">
                <Label className="text-xs text-muted-foreground">الأعمدة الفرعية</Label>
                {newColumnSubColumns.length > 0 && (
                  <div className="space-y-1">
                    {newColumnSubColumns.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between px-2 py-1 bg-secondary/40 rounded-md border border-border/40">
                        <span className="text-xs text-foreground">{sub.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{sub.type === 'text' ? 'نص' : sub.type === 'number' ? 'رقم' : 'تاريخ'}</Badge>
                          <button type="button" onClick={() => setNewColumnSubColumns(prev => prev.filter(c => c.id !== sub.id))} className="text-muted-foreground hover:text-accent"><X className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">اسم العمود الفرعي</Label>
                    <Input value={newTableSubColumnName} onChange={(e) => setNewTableSubColumnName(e.target.value)} placeholder="مثال: رقم" className="bg-input/50 border-border/50 text-right" dir="rtl" maxLength={30} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">النوع</Label>
                    <div className="flex gap-1">
                      {(['text', 'number', 'date'] as const).map(type => (
                        <button key={type} type="button" onClick={() => setNewTableSubColumnType(type)}
                          className={`px-3 py-2 rounded-lg border text-xs transition-all ${newTableSubColumnType === type ? 'border-primary bg-primary/20 text-primary' : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}>
                          {type === 'text' ? 'نص' : type === 'number' ? 'رقم' : 'تاريخ'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => {
                    if (!newTableSubColumnName.trim()) return;
                    setNewColumnSubColumns(prev => [...prev, { id: generateId(), name: newTableSubColumnName.trim(), type: newTableSubColumnType }]);
                    setNewTableSubColumnName(''); setNewTableSubColumnType('text');
                  }}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setNewColumnSubColumns([{ id: generateId(), name: 'رقم', type: 'number' }, { id: generateId(), name: 'التاريخ', type: 'date' }])}>قالب جاهز: رقم / التاريخ</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setNewColumnSubColumns([])}>مسح الأعمدة الفرعية</Button>
                </div>
              </div>
            )}
            {newColumnType !== 'compound' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">خيارات هذا العمود (اختياري - افصل بفاصلة)</Label>
                <Input value={newColumnOptions} onChange={(e) => setNewColumnOptions(e.target.value)} placeholder="مثال: وارد, صادر, محفوظ" className="bg-input/50 border-border/50 text-right" dir="rtl" />
              </div>
            )}
          </div>
          <div className="mt-2 space-y-1">
            <Label className="text-xs text-muted-foreground">نماذج جاهزة للصفوف (اختياري)</Label>
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <button type="button" onClick={() => setNewFieldRowTemplate(newFieldRowTemplate === 'monthsOfYear' ? null : 'monthsOfYear')}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${newFieldRowTemplate === 'monthsOfYear' ? 'bg-primary border-primary' : 'border-border/50 bg-secondary/30'}`}>
                {newFieldRowTemplate === 'monthsOfYear' && <Check className="w-3 h-3 text-primary-foreground" />}
              </button>
              <span>إنشاء صفوف تلقائيًا لكل شهور السنة</span>
            </label>
          </div>
        </div>
      )}

      {/* Required */}
      <label className="flex items-center gap-3 cursor-pointer">
        <button type="button" onClick={() => setNewFieldRequired(!newFieldRequired)}
          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${newFieldRequired ? 'bg-primary border-primary' : 'border-border/50 bg-secondary/30'}`}>
          {newFieldRequired && <Check className="w-3 h-3 text-primary-foreground" />}
        </button>
        <span className="text-sm text-foreground">حقل مطلوب</span>
      </label>

      <Button type="button" variant={editingField ? "default" : "outline"} onClick={handleSubmit} className="w-full">
        <Plus className="w-4 h-4 ml-2" />
        {editingField ? 'تحديث الحقل' : 'إضافة الحقل'}
      </Button>
    </div>
  );
};

export default FieldForm;