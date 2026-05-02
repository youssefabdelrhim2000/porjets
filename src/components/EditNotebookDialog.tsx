import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Book, Users, Car, Building, Shield,
  FileText, ClipboardList, Map, Save, Plus, Trash2,
  GripVertical, Type, Hash, Image, ListChecks, Calendar,
  AlignLeft, X, Check, FolderPlus, Folder, Layers, CalendarRange,
  Edit2, Table, Loader2,
} from 'lucide-react';
import { NOTEBOOK_COLORS, NOTEBOOK_ICONS } from '@/lib/constants';
import api from '@/lib/axios';
import type { Notebook, FieldDefinition, FieldType, SubField, TableColumn } from '@/types/notebook';
import { useToast } from '@/hooks/use-toast';
import { DateField } from './fields/DateField'; // عدل المسار لو الكومبوننت في مكان تاني

// ==========================================
// Helpers
// ==========================================
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const ICON_MAP: Record<string, React.ElementType> = {
  book: Book,
  users: Users,
  car: Car,
  building: Building,
  shield: Shield,
  file: FileText,
  clipboard: ClipboardList,
  map: Map,
};

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ElementType; description?: string }[] = [
  { value: 'text',                   label: 'نص',                      icon: Type,          description: 'نص عادي' },
  { value: 'number',                 label: 'رقم',                     icon: Hash,          description: 'أرقام فقط' },
  { value: 'textarea',               label: 'نص طويل',                 icon: AlignLeft,     description: 'نص متعدد الأسطر' },
  { value: 'image',                  label: 'صورة',                    icon: Image,         description: 'رفع صورة' },
  { value: 'choice',                 label: 'اختيار',                  icon: ListChecks,    description: 'خيارات محددة' },
  { value: 'date',                   label: 'تاريخ',                   icon: Calendar,      description: 'تاريخ' },
  { value: 'compound',               label: 'عناصر متعددة',            icon: Layers,        description: 'مثل: بلد، مركز، محافظة' },
  { value: 'yearlyBatches',          label: 'دفعات سنوية',             icon: CalendarRange, description: 'بيانات مقسمة بالسنوات' },
  { value: 'selectableBatches',      label: 'دفعات قابلة للاختيار',    icon: ListChecks,    description: 'مثل: صادر/وارد بدفعات 2023, 2024...' },
  { value: 'quarterlyInvestigations',label: 'تحريات فصلية',            icon: CalendarRange, description: '4 مرات بالسنة (شهر 1، 4، 7، 10)' },
  { value: 'customTable',            label: 'جدول مخصص',               icon: Table,         description: 'جدول بأعمدة مخصصة وصفوف ديناميكية' },
];

// ==========================================
// Sortable Field Item
// ==========================================
interface SortableFieldItemProps {
  field: FieldDefinition;
  editingFieldId: string | null;
  getFieldTypeIcon: (type: FieldType) => React.ElementType;
  onEdit: (field: FieldDefinition) => void;
  onRemove: (id: string) => void;
}

const SortableFieldItem: React.FC<SortableFieldItemProps> = ({
  field, editingFieldId, getFieldTypeIcon, onEdit, onRemove,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  const FieldIcon = getFieldTypeIcon(field.type);
  const isBeingEdited = editingFieldId === field.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 rounded-xl border mr-4 mb-2 transition-all ${
        isDragging
          ? 'border-primary shadow-lg bg-primary/10'
          : isBeingEdited
          ? 'bg-primary/10 border-primary shadow-sm'
          : 'bg-secondary/30 border-border/30 hover:border-primary/30'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-none"
          {...attributes}
          {...listeners}
          aria-label="اسحب لإعادة الترتيب"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <FieldIcon className={`w-4 h-4 ${isBeingEdited ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className={`font-medium ${isBeingEdited ? 'text-primary' : 'text-foreground'}`}>
          {field.name}
        </span>
        {field.type === 'customTable' || field.type === 'flexibleTable' ? (
          <Badge variant="outline" className="text-[10px]">{field.columns?.length || 0} أعمدة</Badge>
        ) : field.required ? (
          <Badge variant="secondary" className="text-[10px]">مطلوب</Badge>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(field)}
          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
          title="تعديل الحقل"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(field.id)}
          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
          title="حذف الحقل"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// Default field form state
// ==========================================
const defaultFieldForm = () => ({
  editingFieldId:         null as string | null,
  newFieldName:           '',
  newFieldType:           'text' as FieldType,
  newFieldRequired:       false,
  newFieldOptions:        '',
  newFieldSection:        '',
  newFieldMaxLength:      '' as number | '',
  // compound
  newFieldSubFields:      [] as SubField[],
  newSubFieldName:        '',
  // yearlyBatches / quarterlyInvestigations
  newFieldStartYear:      new Date().getFullYear(),
  newFieldYearsCount:     4,
  // selectableBatches
  newFieldBatches:        [] as string[],
  newBatchName:           '',
  // customTable / flexibleTable
  newFieldColumns:        [] as TableColumn[],
  newColumnName:          '',
  newColumnType:          'text' as 'text' | 'number' | 'date' | 'compound',
  newColumnSubColumns:    [] as TableColumn[],
  newTableSubColumnName:  '',
  newTableSubColumnType:  'text' as 'text' | 'number' | 'date',
  newColumnOptions:       '',
  newFieldRowTemplate:    null as 'monthsOfYear' | null,
});

// ==========================================
// Main Component
// ==========================================
interface EditNotebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebook: Notebook | null;
  onSuccess: () => void;
}

const EditNotebookDialog: React.FC<EditNotebookDialogProps> = ({
  open, onOpenChange, notebook, onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Step
  const [step, setStep] = useState<1 | 2>(1);

  // Notebook meta
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon]   = useState('book');
  const [selectedColor, setSelectedColor] = useState('gold');
  const [error, setError]             = useState('');

  // Fields & sections
  const [fields, setFields]   = useState<FieldDefinition[]>([]);
  const [sections, setSections] = useState<string[]>(['بيانات أساسية']);
  const [newSectionName, setNewSectionName] = useState('');

  // Field form (flattened into one state object for easy reset)
  const [form, setForm] = useState(defaultFieldForm());
  const setF = (partial: Partial<ReturnType<typeof defaultFieldForm>>) =>
    setForm(prev => ({ ...prev, ...partial }));

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ==========================================
  // Load notebook data when dialog opens
  // ==========================================
  useEffect(() => {
    if (notebook && open) {
      setName(notebook.name);
      setDescription(notebook.description || '');
      setSelectedIcon(notebook.icon);
      setSelectedColor(notebook.color);
      setFields(notebook.fields || []);

      const uniqueSections = [
        ...new Set((notebook.fields || []).map(f => f.section || 'بيانات أساسية')),
      ];
      const resolvedSections = uniqueSections.length > 0 ? uniqueSections : ['بيانات أساسية'];
      setSections(resolvedSections);

      setError('');
      setStep(1);
      setForm({ ...defaultFieldForm(), newFieldSection: resolvedSections[0] || '' });
    }
  }, [notebook, open]);

  // ==========================================
  // Reset field form
  // ==========================================
  const resetFieldForm = (keepSection = false) => {
    setForm(prev => ({
      ...defaultFieldForm(),
      newFieldSection: keepSection ? prev.newFieldSection : (sections[0] || ''),
    }));
  };

  // ==========================================
  // Load field into edit form
  // ==========================================
  const handleLoadFieldForEdit = (field: FieldDefinition) => {
    setForm({
      editingFieldId:        field.id,
      newFieldName:          field.name,
      newFieldType:          field.type,
      newFieldRequired:      field.required || false,
      newFieldSection:       field.section || sections[0] || '',
      newFieldOptions:       field.options?.join(', ') || '',
      newFieldMaxLength:     field.maxLength || '',
      newFieldSubFields:     field.subFields || [],
      newSubFieldName:       '',
      newFieldStartYear:     field.startYear || new Date().getFullYear(),
      newFieldYearsCount:    field.yearsCount || 4,
      newFieldBatches:       field.batches || [],
      newBatchName:          '',
      newFieldColumns:       field.columns || [],
      newColumnName:         '',
      newColumnType:         'text',
      newColumnSubColumns:   [],
      newTableSubColumnName: '',
      newTableSubColumnType: 'text',
      newColumnOptions:      '',
      newFieldRowTemplate:   field.rowTemplate || null,
    });

    // Scroll to edit form
    setTimeout(() => {
      document.querySelector('.edit-field-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // ==========================================
  // Add / Update field
  // ==========================================
  const handleAddOrUpdateField = () => {
    const {
      editingFieldId, newFieldName, newFieldType, newFieldRequired, newFieldSection,
      newFieldOptions, newFieldMaxLength, newFieldSubFields, newFieldStartYear,
      newFieldYearsCount, newFieldBatches, newFieldColumns, newFieldRowTemplate,
    } = form;

    if (!newFieldName.trim())                                             return setError('يرجى إدخال اسم الحقل');
    if (newFieldType === 'choice' && !newFieldOptions.trim())             return setError('يرجى إدخال الخيارات');
    if (newFieldType === 'compound' && newFieldSubFields.length === 0)    return setError('يرجى إضافة عنصر فرعي واحد على الأقل');
    if (newFieldType === 'selectableBatches' && newFieldBatches.length === 0) return setError('يرجى إضافة دفعة واحدة على الأقل');
    if ((newFieldType === 'customTable' || newFieldType === 'flexibleTable') && newFieldColumns.length === 0)
      return setError('يرجى إضافة عمود واحد على الأقل للجدول');

    const currentSection = newFieldSection || sections[0] || 'بيانات أساسية';

    const configuredField: FieldDefinition = {
      id:       editingFieldId || generateId(),
      name:     newFieldName.trim(),
      type:     newFieldType,
      required: newFieldRequired,
      section:  currentSection,
      ...(newFieldType === 'choice' && {
        options: newFieldOptions.split(',').map(o => o.trim()).filter(Boolean),
      }),
      ...((newFieldType === 'text' || newFieldType === 'number') && newFieldMaxLength && {
        maxLength: Number(newFieldMaxLength),
      }),
      ...(newFieldType === 'compound' && { subFields: newFieldSubFields }),
      ...(newFieldType === 'yearlyBatches' && { startYear: newFieldStartYear }),
      ...(newFieldType === 'selectableBatches' && { batches: newFieldBatches }),
      ...(newFieldType === 'quarterlyInvestigations' && {
        startYear: newFieldStartYear,
        yearsCount: newFieldYearsCount,
      }),
      ...((newFieldType === 'customTable' || newFieldType === 'flexibleTable') && {
        columns: newFieldColumns,
        ...(newFieldRowTemplate && { rowTemplate: newFieldRowTemplate }),
      }),
    };

    if (editingFieldId) {
      setFields(prev => prev.map(f => f.id === editingFieldId ? configuredField : f));
      toast({ title: 'تم', description: 'تم تحديث الحقل' });
    } else {
      setFields(prev => [...prev, configuredField]);
    }

    resetFieldForm(true);
    setF({ newFieldSection: currentSection });
    setError('');
  };

  const handleRemoveField = (fieldId: string) => {
    setFields(prev => prev.filter(f => f.id !== fieldId));
    if (form.editingFieldId === fieldId) resetFieldForm();
  };

  // ==========================================
  // Save mutation
  // ==========================================
  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string | number; updatedData: any }) => {
      const response = await api.put(`/notebooks/${payload.id}`, payload.updatedData);
      return response.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notebooks'] });
    },
    onSuccess: (_data, payload) => {
      toast({ title: 'تم', description: 'تم حفظ التعديلات بنجاح' });
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : 'فشل الاتصال بالسيرفر';
      toast({ title: 'خطأ', description: `فشل تعديل الدفتر: ${msg}`, variant: 'destructive' });
    },
    onSettled: (_data, _error, payload) => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      queryClient.invalidateQueries({ queryKey: ['notebook', String(payload?.id)] });
    },
  });

  const handleSave = () => {
    if (fields.length === 0) return setError('يرجى إضافة حقل واحد على الأقل');
    if (!notebook?.id)       return setError('خطأ: لا يوجد معرف للدفتر');
    setError('');

    updateMutation.mutate({
      id: notebook.id,
      updatedData: {
        name:        name.trim(),
        description: description.trim(),
        icon:        selectedIcon,
        color:       selectedColor,
        fields,
        sections,
      },
    });
  };

  const handleNext = () => {
    if (!name.trim()) return setError('يرجى إدخال اسم الدفتر');
    setError('');
    setStep(2);
  };

  const handleClose = () => {
    setError('');
    setStep(1);
    setSections(['بيانات أساسية']);
    setNewSectionName('');
    resetFieldForm();
    onOpenChange(false);
  };

  const getFieldTypeIcon = (type: FieldType) =>
    FIELD_TYPES.find(f => f.value === type)?.icon || Type;

  if (!notebook) return null;

  // ==========================================
  // Destructure form for convenience in render
  // ==========================================
  const {
    editingFieldId,
    newFieldName, newFieldType, newFieldRequired, newFieldSection,
    newFieldOptions, newFieldMaxLength,
    newFieldSubFields, newSubFieldName,
    newFieldStartYear, newFieldYearsCount,
    newFieldBatches, newBatchName,
    newFieldColumns, newColumnName, newColumnType,
    newColumnSubColumns, newTableSubColumnName, newTableSubColumnType,
    newColumnOptions, newFieldRowTemplate,
  } = form;

  const activeSection = newFieldSection || sections[0] || '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {step === 1 ? 'تعديل الدفتر' : 'تعديل الحقول'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 1 ? 'عدّل معلومات الدفتر الأساسية' : 'عدّل أقسام وحقول الدفتر'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 py-4">
          {([1, 2] as const).map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <div className="w-12 h-px bg-border" />}
              <div className={`flex items-center gap-2 ${step === s ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === s ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  {s}
                </div>
                <span className="text-sm font-medium">{s === 1 ? 'المعلومات' : 'الحقول'}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* ======================== STEP 1 ======================== */}
        {step === 1 && (
          <form className="space-y-6" onSubmit={e => { e.preventDefault(); handleNext(); }}>
            <div className="space-y-2">
              <Label htmlFor="edit-name">اسم الدفتر *</Label>
              <Input id="edit-name" value={name} onChange={e => setName(e.target.value)}
                className="bg-input/50 text-right" dir="rtl" maxLength={50} autoFocus />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">الوصف (اختياري)</Label>
              <Textarea id="edit-description" value={description} onChange={e => setDescription(e.target.value)}
                className="bg-input/50 text-right resize-none" dir="rtl" rows={3} maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label>الأيقونة</Label>
              <div className="flex flex-wrap gap-2">
                {NOTEBOOK_ICONS.map(icon => {
                  const IconComponent = ICON_MAP[icon.value];
                  if (!IconComponent) return null;
                  return (
                    <button key={icon.value} type="button" onClick={() => setSelectedIcon(icon.value)}
                      className={`p-3 rounded-xl border transition-all ${selectedIcon === icon.value ? 'border-primary bg-primary/20 text-primary' : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}>
                      <IconComponent className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>اللون</Label>
              <div className="flex flex-wrap gap-2">
                {NOTEBOOK_COLORS.map(color => (
                  <button key={color.value} type="button" onClick={() => setSelectedColor(color.value)}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${selectedColor === color.value ? 'border-primary bg-primary/20 text-primary' : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}>
                    {color.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">إلغاء</Button>
              <Button type="submit" className="flex-1"
                style={{ background: 'var(--gradient-gold)', boxShadow: 'var(--shadow-gold)' }}>
                التالي — تعديل الحقول
              </Button>
            </div>
          </form>
        )}

        {/* ======================== STEP 2 ======================== */}
        {step === 2 && (
          <form className="space-y-6" onSubmit={e => { e.preventDefault(); handleSave(); }}>

            {/* --- Sections --- */}
            <div className="space-y-3">
              <Label className="font-bold flex items-center gap-2">
                <Folder className="w-4 h-4 text-primary" /> أقسام الدفتر
              </Label>
              <div className="flex flex-wrap gap-2">
                {sections.map((section, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg text-sm">
                    <span className="text-primary">{section}</span>
                    {sections.length > 1 && (
                      <button type="button" onClick={() => {
                        setSections(prev => prev.filter((_, idx) => idx !== i));
                        setFields(prev => prev.filter(f => f.section !== section));
                      }} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                  placeholder="اسم القسم الجديد" className="bg-input/50 text-right flex-1" dir="rtl" maxLength={30} />
                <Button type="button" variant="outline" size="icon" onClick={() => {
                  if (newSectionName.trim() && !sections.includes(newSectionName.trim())) {
                    setSections(prev => [...prev, newSectionName.trim()]);
                    setNewSectionName('');
                  }
                }}>
                  <FolderPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* --- Fields list grouped by section --- */}
            {fields.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  الحقول الحالية ({fields.length})
                  <span className="text-xs text-muted-foreground font-normal">
                    — امسك <GripVertical className="w-3 h-3 inline" /> لتحريك الحقل
                  </span>
                </Label>
                <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                  {sections.map(section => {
                    const sectionFields = fields.filter(f => f.section === section);
                    if (sectionFields.length === 0) return null;
                    return (
                      <div key={section} className="space-y-1">
                        <div className="text-xs text-primary font-medium flex items-center gap-1 mb-1">
                          <Folder className="w-3 h-3" /> {section}
                        </div>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event: DragEndEvent) => {
                            const { active, over } = event;
                            if (!over || active.id === over.id) return;
                            setFields(prev => {
                              const oldIndex = prev.findIndex(f => f.id === active.id);
                              const newIndex = prev.findIndex(f => f.id === over.id);
                              return arrayMove(prev, oldIndex, newIndex);
                            });
                          }}
                        >
                          <SortableContext items={sectionFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                            {sectionFields.map(field => (
                              <SortableFieldItem
                                key={field.id}
                                field={field}
                                editingFieldId={editingFieldId}
                                getFieldTypeIcon={getFieldTypeIcon}
                                onEdit={handleLoadFieldForEdit}
                                onRemove={handleRemoveField}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --- Add / Edit Field Form --- */}
            <div className={`edit-field-form p-4 rounded-xl border space-y-4 transition-all ${
              editingFieldId ? 'bg-primary/5 border-primary/50 shadow-md' : 'bg-secondary/20 border-border/30'
            }`}>
              <div className="flex justify-between items-center">
                <Label className={`font-bold ${editingFieldId ? 'text-primary' : 'text-foreground'}`}>
                  {editingFieldId ? 'تعديل بيانات الحقل' : 'إضافة حقل جديد'}
                </Label>
                {editingFieldId && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => resetFieldForm()} className="h-6 text-xs">
                    إلغاء التعديل
                  </Button>
                )}
              </div>

              {/* Section selector */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">القسم</Label>
                <div className="flex flex-wrap gap-2">
                  {sections.map(section => (
                    <button key={section} type="button" onClick={() => setF({ newFieldSection: section })}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                        activeSection === section
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'
                      }`}>
                      {section}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field name */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">اسم الحقل</Label>
                <Input value={newFieldName} onChange={e => setF({ newFieldName: e.target.value })}
                  placeholder="مثال: الاسم الكامل" className="bg-input/50 text-right" dir="rtl" maxLength={50} />
              </div>

              {/* Field type */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">نوع الحقل</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {FIELD_TYPES.map(type => (
                    <button key={type.value} type="button" onClick={() => setF({ newFieldType: type.value })}
                      title={type.description}
                      className={`flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-lg border text-[11px] transition-all ${
                        newFieldType === type.value
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'
                      }`}>
                      <type.icon className="w-4 h-4 mb-0.5" />
                      <span className="text-center leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ---- Type-specific fields ---- */}

              {/* text / number: max length */}
              {(newFieldType === 'text' || newFieldType === 'number') && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    الحد الأقصى {newFieldType === 'number' ? 'للأرقام' : 'للحروف'} (اختياري)
                  </Label>
                  <Input type="number" value={newFieldMaxLength}
                    onChange={e => setF({ newFieldMaxLength: e.target.value ? Number(e.target.value) : '' })}
                    placeholder={newFieldType === 'number' ? 'مثال: 14 لرقم البطاقة' : 'مثال: 100'}
                    className="bg-input/50 text-right" dir="rtl" min={1} max={500} />
                </div>
              )}

              {/* choice: options */}
              {newFieldType === 'choice' && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">الخيارات (افصل بفاصلة)</Label>
                  <Input value={newFieldOptions} onChange={e => setF({ newFieldOptions: e.target.value })}
                    placeholder="خيار 1, خيار 2, خيار 3" className="bg-input/50 text-right" dir="rtl" />
                </div>
              )}

              {/* compound: sub-fields */}
              {newFieldType === 'compound' && (
                <div className="space-y-3 p-3 bg-background/50 border border-border/50 rounded-lg">
                  <Label className="text-sm text-muted-foreground">العناصر الفرعية (مثل: البلد، المركز، المحافظة)</Label>
                  {newFieldSubFields.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newFieldSubFields.map((sf, i) => (
                        <div key={sf.id} className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded-lg text-xs">
                          <span className="text-primary">{sf.name}</span>
                          <button type="button"
                            onClick={() => setF({ newFieldSubFields: newFieldSubFields.filter((_, idx) => idx !== i) })}
                            className="text-muted-foreground hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input value={newSubFieldName} onChange={e => setF({ newSubFieldName: e.target.value })}
                      placeholder="اسم العنصر (مثال: المحافظة)" className="bg-input/50 text-right flex-1" dir="rtl" maxLength={30} />
                    <Button type="button" variant="outline" size="icon" onClick={() => {
                      if (newSubFieldName.trim()) {
                        setF({
                          newFieldSubFields: [...newFieldSubFields, { id: generateId(), name: newSubFieldName.trim() }],
                          newSubFieldName: '',
                        });
                      }
                    }}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* yearlyBatches: start year */}
              {newFieldType === 'yearlyBatches' && (
                <div className="space-y-2 p-3 bg-background/50 border border-border/50 rounded-lg">
                  <Label className="text-sm text-muted-foreground">سنة البداية</Label>
                  <Input type="number" value={newFieldStartYear}
                    onChange={e => setF({ newFieldStartYear: Number(e.target.value) })}
                    placeholder="مثال: 2023" className="bg-input/50 text-right" dir="rtl"
                    min={2000} max={new Date().getFullYear()} />
                  <p className="text-xs text-muted-foreground">
                    سيتم إنشاء حقول من {newFieldStartYear} حتى السنة الحالية ({new Date().getFullYear()})
                  </p>
                </div>
              )}

              {/* selectableBatches: batches list */}
              {newFieldType === 'selectableBatches' && (
                <div className="space-y-3 p-3 bg-background/50 border border-border/50 rounded-lg">
                  <Label className="text-sm text-muted-foreground">الدفعات المتاحة (مثل: 2023، 2024، 2025)</Label>
                  {newFieldBatches.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newFieldBatches.map((batch, i) => (
                        <div key={i} className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded-lg text-xs">
                          <span className="text-primary">{batch}</span>
                          <button type="button"
                            onClick={() => setF({ newFieldBatches: newFieldBatches.filter((_, idx) => idx !== i) })}
                            className="text-muted-foreground hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input value={newBatchName} onChange={e => setF({ newBatchName: e.target.value })}
                      placeholder="اسم الدفعة (مثال: 2023)" className="bg-input/50 text-right flex-1" dir="rtl" maxLength={30} />
                    <Button type="button" variant="outline" size="icon" onClick={() => {
                      if (newBatchName.trim() && !newFieldBatches.includes(newBatchName.trim())) {
                        setF({ newFieldBatches: [...newFieldBatches, newBatchName.trim()], newBatchName: '' });
                      }
                    }}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">المستخدم سيختار دفعة واحدة ويضيف بيانات لها</p>
                </div>
              )}

              {/* quarterlyInvestigations */}
              {newFieldType === 'quarterlyInvestigations' && (
                <div className="space-y-4 p-3 bg-background/50 border border-border/50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">سنة البداية</Label>
                    <Input type="number" value={newFieldStartYear}
                      onChange={e => setF({ newFieldStartYear: Number(e.target.value) })}
                      placeholder="مثال: 2023" className="bg-input/50 text-right" dir="rtl"
                      min={2000} max={new Date().getFullYear()} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">عدد السنوات</Label>
                    <div className="flex gap-2 flex-wrap">
                      {[2, 3, 4, 5, 6].map(count => (
                        <button key={count} type="button" onClick={() => setF({ newFieldYearsCount: count })}
                          className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                            newFieldYearsCount === count
                              ? 'border-primary bg-primary/20 text-primary'
                              : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'
                          }`}>
                          {count} سنوات
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg border border-border/30">
                    <p className="text-xs text-muted-foreground mb-2">الفترات لكل سنة:</p>
                    <div className="flex flex-wrap gap-2">
                      {['شهر 1 (يناير)', 'شهر 4 (أبريل)', 'شهر 7 (يوليو)', 'شهر 10 (أكتوبر)'].map(m => (
                        <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      الفترة: {newFieldStartYear} إلى {newFieldStartYear + newFieldYearsCount - 1}
                    </p>
                  </div>
                </div>
              )}

              {/* customTable / flexibleTable: columns builder */}
              {(newFieldType === 'customTable' || newFieldType === 'flexibleTable') && (
                <div className="space-y-4 p-3 bg-background/50 border border-border/50 rounded-lg">
                  <Label className="text-sm font-bold flex items-center justify-between">
                    <span>أعمدة الجدول</span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      (إعدادات التصميم للأدمن فقط)
                    </span>
                  </Label>

                  {/* Existing columns */}
                  {newFieldColumns.length > 0 && (
                    <div className="space-y-2">
                      {newFieldColumns.map((col, i) => (
                        <div key={col.id} className="flex items-center justify-between p-2 bg-primary/10 border border-primary/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-primary font-medium">{col.name}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {col.type === 'text' ? 'نص' : col.type === 'number' ? 'رقم' : col.type === 'date' ? 'تاريخ' : 'مركب'}
                            </Badge>
                            {col.subColumns && col.subColumns.length > 0 && (
                              <Badge variant="outline" className="text-[10px]">{col.subColumns.length} فرعي</Badge>
                            )}
                            {col.options && col.options.length > 0 && (
                              <Badge variant="outline" className="text-[10px]">قائمة اختيار</Badge>
                            )}
                          </div>
                          <button type="button"
                            onClick={() => setF({ newFieldColumns: newFieldColumns.filter((_, idx) => idx !== i) })}
                            className="text-muted-foreground hover:text-destructive">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add column */}
                  <div className="flex flex-col gap-3 pt-2 border-t border-border/50">
                    <div className="flex gap-2 items-end flex-wrap">
                      <div className="flex-1 min-w-[120px] space-y-1">
                        <Label className="text-xs text-muted-foreground">اسم العمود الجديد</Label>
                        <Input value={newColumnName} onChange={e => setF({ newColumnName: e.target.value })}
                          placeholder="الاسم" className="h-9 text-right" dir="rtl" maxLength={30} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">النوع</Label>
                        <div className="flex gap-1 flex-wrap">
                          {(['text', 'number', 'date', 'compound'] as const).map(type => (
                            <button key={type} type="button" onClick={() => setF({ newColumnType: type })}
                              className={`px-2 py-1.5 rounded border text-xs ${
                                newColumnType === type
                                  ? 'border-primary bg-primary/20 text-primary'
                                  : 'border-border/50 text-muted-foreground hover:bg-secondary'
                              }`}>
                              {type === 'text' ? 'نص' : type === 'number' ? 'رقم' : type === 'date' ? 'تاريخ' : 'مركب'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => {
                        if (!newColumnName.trim()) return;
                        if (newColumnType === 'compound' && newColumnSubColumns.length === 0)
                          return setError('العمود المركب يتطلب عمودين فرعيين على الأقل');
                        const parsedOpts = newColumnOptions.split(',').map(o => o.trim()).filter(Boolean);
                        const col: TableColumn = {
                          id: generateId(),
                          name: newColumnName.trim(),
                          type: newColumnType,
                          ...(newColumnType === 'compound' && { subColumns: newColumnSubColumns }),
                          ...(newColumnType !== 'compound' && parsedOpts.length > 0 && { options: parsedOpts }),
                        };
                        setF({
                          newFieldColumns: [...newFieldColumns, col],
                          newColumnName: '',
                          newColumnSubColumns: [],
                          newTableSubColumnName: '',
                          newColumnOptions: '',
                        });
                        setError('');
                      }}>
                        <Plus className="w-4 h-4 ml-1" /> إضافة
                      </Button>
                    </div>

                    {/* Compound sub-columns */}
                    {newColumnType === 'compound' && (
                      <div className="space-y-2 p-3 bg-secondary/30 rounded border border-border/40">
                        <Label className="text-xs text-muted-foreground">الأعمدة الفرعية</Label>
                        {newColumnSubColumns.length > 0 && (
                          <div className="space-y-1">
                            {newColumnSubColumns.map(sub => (
                              <div key={sub.id} className="flex items-center justify-between px-2 py-1 bg-secondary/40 rounded border border-border/40">
                                <span className="text-xs">{sub.name}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px]">
                                    {sub.type === 'text' ? 'نص' : sub.type === 'number' ? 'رقم' : 'تاريخ'}
                                  </Badge>
                                  <button type="button"
                                    onClick={() => setF({ newColumnSubColumns: newColumnSubColumns.filter(c => c.id !== sub.id) })}
                                    className="text-muted-foreground hover:text-destructive">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">اسم العمود الفرعي</Label>
                            <Input value={newTableSubColumnName}
                              onChange={e => setF({ newTableSubColumnName: e.target.value })}
                              placeholder="مثال: رقم" className="h-8 text-right text-xs" dir="rtl" maxLength={30} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">النوع</Label>
                            <div className="flex gap-1">
                              {(['text', 'number', 'date'] as const).map(type => (
                                <button key={type} type="button" onClick={() => setF({ newTableSubColumnType: type })}
                                  className={`px-2 py-1.5 rounded border text-xs ${
                                    newTableSubColumnType === type
                                      ? 'border-primary bg-primary/20 text-primary'
                                      : 'border-border/50 text-muted-foreground hover:bg-secondary'
                                  }`}>
                                  {type === 'text' ? 'نص' : type === 'number' ? 'رقم' : 'تاريخ'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => {
                            if (!newTableSubColumnName.trim()) return;
                            setF({
                              newColumnSubColumns: [
                                ...newColumnSubColumns,
                                { id: generateId(), name: newTableSubColumnName.trim(), type: newTableSubColumnType },
                              ],
                              newTableSubColumnName: '',
                            });
                          }}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Button type="button" variant="outline" size="sm" onClick={() =>
                            setF({ newColumnSubColumns: [
                              { id: generateId(), name: 'رقم', type: 'number' },
                              { id: generateId(), name: 'التاريخ', type: 'date' },
                            ]})}>
                            قالب جاهز: رقم / تاريخ
                          </Button>
                          <Button type="button" variant="outline" size="sm"
                            onClick={() => setF({ newColumnSubColumns: [] })}>
                            مسح الفرعية
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Column options (for non-compound) */}
                    {newColumnType !== 'compound' && (
                      <div>
                        <Input value={newColumnOptions} onChange={e => setF({ newColumnOptions: e.target.value })}
                          placeholder="خيارات اختيارية (افصل بفاصلة)" className="h-8 text-right text-xs" dir="rtl" />
                      </div>
                    )}
                  </div>

                  {/* Row template */}
                  <div className="pt-2 border-t border-border/40">
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <button type="button"
                        onClick={() => setF({ newFieldRowTemplate: newFieldRowTemplate === 'monthsOfYear' ? null : 'monthsOfYear' })}
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          newFieldRowTemplate === 'monthsOfYear' ? 'bg-primary border-primary' : 'border-border/50'
                        }`}>
                        {newFieldRowTemplate === 'monthsOfYear' && <Check className="w-3 h-3 text-primary-foreground" />}
                      </button>
                      <span>قالب جاهز: إنشاء صفوف بشهور السنة تلقائياً</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Required checkbox */}
              <label className="flex items-center gap-3 cursor-pointer pt-2">
                <button type="button" onClick={() => setF({ newFieldRequired: !newFieldRequired })}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    newFieldRequired ? 'bg-primary border-primary' : 'border-border/50 bg-secondary/30'
                  }`}>
                  {newFieldRequired && <Check className="w-3 h-3 text-primary-foreground" />}
                </button>
                <span className="text-sm text-foreground">حقل إجباري</span>
              </label>

              {/* Add / Update button */}
              <Button type="button" onClick={handleAddOrUpdateField} className="w-full"
                variant={editingFieldId ? 'default' : 'outline'}>
                {editingFieldId
                  ? <><Save className="w-4 h-4 ml-2" /> تحديث بيانات الحقل</>
                  : <><Plus className="w-4 h-4 ml-2" /> إضافة الحقل للقائمة</>}
              </Button>
            </div>

            {/* Save / Back */}
            <div className="flex gap-3 pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                السابق
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="flex-1"
                style={{ background: 'var(--gradient-gold)', boxShadow: 'var(--shadow-gold)' }}>
                {updateMutation.isPending
                  ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الحفظ...</>
                  : <><Save className="w-4 h-4 ml-2" /> حفظ جميع التعديلات</>}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditNotebookDialog;