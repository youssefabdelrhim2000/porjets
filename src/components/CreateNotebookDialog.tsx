import React, { useState } from 'react';
import axios from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  Plus, Trash2, Book, Users, Car, Building, Shield, 
  FileText, ClipboardList, Map, GripVertical, Type, Hash, 
  Image, ListChecks, Calendar, AlignLeft, X, Check, FolderPlus, Folder, Layers, Loader2, CalendarRange, Table
} from 'lucide-react';
import { NOTEBOOK_COLORS, NOTEBOOK_ICONS } from '@/lib/storage';
import type { Notebook, FieldDefinition, FieldType, SubField, TableColumn } from '@/types/notebook';
import api from '@/lib/axios';


// ==========================================
// 1. Safe ID Generator
// ==========================================
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Icon mapping
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
  { value: 'text', label: 'نص', icon: Type, description: 'نص عادي' },
  { value: 'number', label: 'رقم', icon: Hash, description: 'أرقام فقط' },
  { value: 'textarea', label: 'نص طويل', icon: AlignLeft, description: 'نص متعدد الأسطر' },
  { value: 'image', label: 'صورة', icon: Image, description: 'رفع صورة' },
  { value: 'choice', label: 'اختيار', icon: ListChecks, description: 'خيارات محددة' },
  { value: 'date', label: 'تاريخ', icon: Calendar, description: 'تاريخ' },
  { value: 'compound', label: 'عناصر متعددة', icon: Layers, description: 'مثل: بلد، مركز، محافظة' },
  { value: 'yearlyBatches', label: 'دفعات سنوية', icon: CalendarRange, description: 'بيانات مقسمة بالسنوات' },
  { value: 'selectableBatches', label: 'دفعات قابلة للاختيار', icon: ListChecks, description: 'مثل: صادر/وارد بدفعات 2023, 2024...' },
  { value: 'quarterlyInvestigations', label: 'تحريات فصلية', icon: CalendarRange, description: '4 مرات بالسنة (شهر 1، 4، 7، 10)' },
  { value: 'customTable', label: 'جدول مخصص', icon: Table, description: 'جدول بأعمدة مخصصة وصفوف ديناميكية' },
];

// ==========================================
// Sortable Field Item Component
// ==========================================
interface SortableFieldItemProps {
  field: FieldDefinition;
  getFieldTypeIcon: (type: FieldType) => React.ElementType;
  onRemove: (id: string) => void;
}

const SortableFieldItem: React.FC<SortableFieldItemProps> = ({ field, getFieldTypeIcon, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  const FieldIcon = getFieldTypeIcon(field.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 bg-secondary/30 rounded-xl border mr-4 transition-colors ${
        isDragging ? 'border-primary shadow-lg bg-secondary/60' : 'border-border/30'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* مقبض السحب - هنا اليوزر يمسك ويحرك */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-none"
          {...attributes}
          {...listeners}
          aria-label="اسحب لإعادة الترتيب"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <FieldIcon className="w-4 h-4 text-primary" />
        <span className="font-medium text-foreground">{field.name}</span>
        {field.required && (
          <Badge variant="secondary" className="text-xs">مطلوب</Badge>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(field.id)}
        className="p-1 text-muted-foreground hover:text-accent transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

interface CreateNotebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateNotebookDialog: React.FC<CreateNotebookDialogProps> = ({ open, onOpenChange, onSuccess }) => {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('book');
  const [selectedColor, setSelectedColor] = useState('gold');
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [error, setError] = useState('');

  // New field form
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldSection, setNewFieldSection] = useState('');
  const [newFieldMaxLength, setNewFieldMaxLength] = useState<number | ''>('');
  const [newFieldSubFields, setNewFieldSubFields] = useState<SubField[]>([]);
  const [newSubFieldName, setNewSubFieldName] = useState('');
  const [newFieldStartYear, setNewFieldStartYear] = useState(2023);
  const [newFieldBatches, setNewFieldBatches] = useState<string[]>([]);
  const [newBatchName, setNewBatchName] = useState('');
  const [newFieldYearsCount, setNewFieldYearsCount] = useState(4);
  const [newFieldColumns, setNewFieldColumns] = useState<TableColumn[]>([]);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<'text' | 'number' | 'date' | 'compound'>('text');
  const [newColumnSubColumns, setNewColumnSubColumns] = useState<TableColumn[]>([]);
  const [newTableSubColumnName, setNewTableSubColumnName] = useState('');
  const [newTableSubColumnType, setNewTableSubColumnType] = useState<'text' | 'number' | 'date'>('text');
  const [newColumnOptions, setNewColumnOptions] = useState('');
  const [newFieldRowTemplate, setNewFieldRowTemplate] = useState<'monthsOfYear' | null>(null);

  // Section management
  const [sections, setSections] = useState<string[]>(['بيانات أساسية']);
  const [newSectionName, setNewSectionName] = useState('');

  // ==========================================
  // DnD Kit Sensors
  // ==========================================
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // يبدأ السحب بعد تحريك 5 بكسل (يمنع التعارض مع الكليك العادي)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFields((currentFields) => {
        const oldIndex = currentFields.findIndex((f) => f.id === active.id);
        const newIndex = currentFields.findIndex((f) => f.id === over.id);
        return arrayMove(currentFields, oldIndex, newIndex);
      });
    }
  };

  const resetForm = () => {
    setStep(1);
    setName('');
    setDescription('');
    setSelectedIcon('book');
    setSelectedColor('gold');
    setFields([]);
    setError('');
    setSections(['بيانات أساسية']);
    resetFieldForm();
  };

  const resetFieldForm = (keepSection = false) => {
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setNewFieldOptions('');
    if (!keepSection) {
      setNewFieldSection(sections[0] || '');
    }
    setNewFieldMaxLength('');
    setNewFieldSubFields([]);
    setNewSubFieldName('');
    setNewFieldStartYear(2023);
    setNewFieldBatches([]);
    setNewBatchName('');
    setNewFieldYearsCount(4);
    setNewFieldColumns([]);
    setNewColumnName('');
    setNewColumnType('text');
    setNewColumnSubColumns([]);
    setNewTableSubColumnName('');
    setNewTableSubColumnType('text');
    setNewColumnOptions('');
    setNewFieldRowTemplate(null);
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) {
      setError('يرجى إدخال اسم الحقل');
      return;
    }

    if (newFieldType === 'choice' && !newFieldOptions.trim()) {
      setError('يرجى إدخال الخيارات للاختيار');
      return;
    }

    if (newFieldType === 'compound' && newFieldSubFields.length === 0) {
      setError('يرجى إضافة عنصر فرعي واحد على الأقل');
      return;
    }

    if (newFieldType === 'selectableBatches' && newFieldBatches.length === 0) {
      setError('يرجى إضافة دفعة واحدة على الأقل');
      return;
    }

    if (newFieldType === 'customTable' && newFieldColumns.length === 0) {
      setError('يرجى إضافة عمود واحد على الأقل للجدول');
      return;
    }

    const currentSection = newFieldSection || sections[0] || 'بيانات أساسية';
    
    const newField: FieldDefinition = {
      id: generateId(),
      name: newFieldName.trim(),
      type: newFieldType,
      required: newFieldRequired,
      section: currentSection,
      ...(newFieldType === 'choice' && {
        options: newFieldOptions.split(',').map(o => o.trim()).filter(Boolean),
      }),
      ...((newFieldType === 'text' || newFieldType === 'number') && newFieldMaxLength && {
        maxLength: Number(newFieldMaxLength),
      }),
      ...(newFieldType === 'compound' && {
        subFields: newFieldSubFields,
      }),
      ...(newFieldType === 'yearlyBatches' && {
        startYear: newFieldStartYear,
      }),
      ...(newFieldType === 'selectableBatches' && {
        batches: newFieldBatches,
      }),
      ...(newFieldType === 'quarterlyInvestigations' && {
        startYear: newFieldStartYear,
        yearsCount: newFieldYearsCount,
      }),
      ...(newFieldType === 'customTable' && {
        columns: newFieldColumns,
        ...(newFieldRowTemplate && { rowTemplate: newFieldRowTemplate }),
      }),
    };

    setFields([...fields, newField]);
    resetFieldForm(true);
    setNewFieldSection(currentSection);
    setError('');
  };

  const handleRemoveField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId));
  };

  const handleNext = () => {
    if (!name.trim()) {
      setError('يرجى إدخال اسم الدفتر');
      return;
    }
    setError('');
    setStep(2);
  };

  // ==========================================
  // Optimistic Update Logic + Backend Compatibility
  // ==========================================
  const createMutation = useMutation({
    mutationFn: async (notebookData: any) => {
      const payload = {
        name: notebookData.name.trim(),
        description: notebookData.description.trim(),
        icon: notebookData.icon,
        color: notebookData.color,
        fields: JSON.stringify(notebookData.fields || []),  
      };
  
      const response = await api.post('/notebooks', payload);
      return response.data;
    },
  
    onMutate: async (newNotebook) => {
      await queryClient.cancelQueries({ queryKey: ['notebooks'] });
  
      const optimisticNotebook: Notebook = {
        id: `temp-${Date.now()}`,
        name: newNotebook.name,
        description: newNotebook.description || '',
        icon: newNotebook.icon,
        color: newNotebook.color,
        fields: newNotebook.fields || [],           
        created_at: new Date().toISOString(),
      };
  
      queryClient.setQueryData<Notebook[]>(['notebooks'], (old) => {
        return [...(old || []), optimisticNotebook];
      });
  
      resetForm();
      onOpenChange(false);
      onSuccess();
    },
  
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err) 
        ? (err.response?.data?.error || err.message) 
        : 'فشل الاتصال بالسيرفر';
      
      console.error("Backend Error:", err);
      alert(`فشل إنشاء الدفتر: ${msg}`);
      
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    },
  
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    }
  });

  const handleCreate = () => {
    if (!name.trim()) {
      setError('يرجى كتابة اسم الدفتر');
      return;
    }
  
    createMutation.mutate({
      name: name,
      description: description,
      icon: selectedIcon,
      color: selectedColor,
      fields: fields,        // أرسل الـ array عادي، الـ mutation هيحوله لـ JSON
    });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const getFieldTypeIcon = (type: FieldType) => {
    const fieldType = FIELD_TYPES.find(f => f.value === type);
    return fieldType?.icon || Type;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {step === 1 ? 'إنشاء دفتر جديد' : 'تخصيص الحقول'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 1 ? 'أدخل معلومات الدفتر الأساسية' : 'أضف الحقول التي تريدها في الدفتر'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 py-4">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
              1
            </div>
            <span className="text-sm font-medium">المعلومات</span>
          </div>
          <div className="w-12 h-px bg-border" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
              2
            </div>
            <span className="text-sm font-medium">الحقول</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg text-accent text-sm">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">اسم الدفتر *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: سجل الزوار (Enter للمتابعة)"
                className="bg-input/50 border-border/50 text-right"
                dir="rtl"
                maxLength={50}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">الوصف (اختياري)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف مختصر للدفتر"
                className="bg-input/50 border-border/50 text-right resize-none"
                dir="rtl"
                rows={3}
                maxLength={200}
              />
            </div>

            {/* Icon Selection */}
            <div className="space-y-2">
              <Label className="text-foreground">الأيقونة</Label>
              <div className="flex flex-wrap gap-2">
                {NOTEBOOK_ICONS.map(icon => {
                  const IconComponent = ICON_MAP[icon.value];
                  return (
                    <button
                      key={icon.value}
                      type="button"
                      onClick={() => setSelectedIcon(icon.value)}
                      className={`p-3 rounded-xl border transition-all ${
                        selectedIcon === icon.value
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-2">
              <Label className="text-foreground">اللون</Label>
              <div className="flex flex-wrap gap-2">
                {NOTEBOOK_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                      selectedColor === color.value
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {color.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Next Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                style={{ 
                  background: 'var(--gradient-gold)',
                  boxShadow: 'var(--shadow-gold)' 
                }}
              >
                التالي
              </Button>
            </div>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
            {/* Sections Management */}
            <div className="space-y-3">
              <Label className="text-foreground font-bold flex items-center gap-2">
                <Folder className="w-4 h-4 text-primary" />
                أقسام الدفتر
              </Label>
              <div className="flex flex-wrap gap-2">
                {sections.map((section, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg text-sm"
                  >
                    <span className="text-primary">{section}</span>
                    {sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSections(sections.filter((_, i) => i !== index));
                          setFields(fields.filter(f => f.section !== section));
                        }}
                        className="text-muted-foreground hover:text-accent"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="اسم القسم الجديد (مثال: تحريات سياسية)"
                  className="bg-input/50 border-border/50 text-right flex-1"
                  dir="rtl"
                  maxLength={30}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (newSectionName.trim() && !sections.includes(newSectionName.trim())) {
                      setSections([...sections, newSectionName.trim()]);
                      setNewSectionName('');
                    }
                  }}
                >
                  <FolderPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Added Fields List - Grouped by Section with Drag & Drop */}
            {fields.length > 0 && (
              <div className="space-y-3">
                <Label className="text-foreground flex items-center gap-2">
                  الحقول المضافة ({fields.length})
                  <span className="text-xs text-muted-foreground font-normal">
                    — امسك أيقونة <GripVertical className="w-3 h-3 inline" /> لتحريك الحقل
                  </span>
                </Label>
                <div className="space-y-4 max-h-48 overflow-y-auto">
                  {sections.map(section => {
                    const sectionFields = fields.filter(f => f.section === section);
                    if (sectionFields.length === 0) return null;
                    return (
                      <div key={section} className="space-y-2">
                        <div className="text-xs text-primary font-medium flex items-center gap-1">
                          <Folder className="w-3 h-3" />
                          {section}
                        </div>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => {
                            const { active, over } = event;
                            if (!over || active.id === over.id) return;

                            setFields((currentFields) => {
                              // نحسب الـ index بناءً على الـ fields الكاملة مش الـ sectionFields بس
                              const oldIndex = currentFields.findIndex((f) => f.id === active.id);
                              const newIndex = currentFields.findIndex((f) => f.id === over.id);
                              return arrayMove(currentFields, oldIndex, newIndex);
                            });
                          }}
                        >
                          <SortableContext
                            items={sectionFields.map(f => f.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {sectionFields.map((field) => (
                                <SortableFieldItem
                                  key={field.id}
                                  field={field}
                                  getFieldTypeIcon={getFieldTypeIcon}
                                  onRemove={handleRemoveField}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add New Field Form */}
            <div className="p-4 bg-secondary/20 rounded-xl border border-border/30 space-y-4">
              <Label className="text-foreground font-bold">إضافة حقل جديد</Label>
              
              {/* Section Selection */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">القسم</Label>
                <div className="flex flex-wrap gap-2">
                  {sections.map(section => (
                    <button
                      key={section}
                      type="button"
                      onClick={() => setNewFieldSection(section)}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                        (newFieldSection || sections[0]) === section
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {section}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field Name */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">اسم الحقل</Label>
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="مثال: الاسم الكامل"
                  className="bg-input/50 border-border/50 text-right"
                  dir="rtl"
                  maxLength={50}
                />
              </div>

              {/* Field Type */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">نوع الحقل</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FIELD_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setNewFieldType(type.value)}
                      className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg border text-xs transition-all ${
                        newFieldType === type.value
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <type.icon className="w-4 h-4" />
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Length - for text/number */}
              {(newFieldType === 'text' || newFieldType === 'number') && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    الحد الأقصى {newFieldType === 'number' ? 'للأرقام' : 'للحروف'} (اختياري)
                  </Label>
                  <Input
                    type="number"
                    value={newFieldMaxLength}
                    onChange={(e) => setNewFieldMaxLength(e.target.value ? Number(e.target.value) : '')}
                    placeholder={newFieldType === 'number' ? 'مثال: 14 لرقم البطاقة' : 'مثال: 100'}
                    className="bg-input/50 border-border/50 text-right"
                    dir="rtl"
                    min={1}
                    max={500}
                  />
                </div>
              )}

              {/* Choice Options */}
              {newFieldType === 'choice' && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">الخيارات (افصل بفاصلة)</Label>
                  <Input
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    placeholder="خيار 1, خيار 2, خيار 3"
                    className="bg-input/50 border-border/50 text-right"
                    dir="rtl"
                  />
                </div>
              )}

              {/* Compound Sub-Fields */}
              {newFieldType === 'compound' && (
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">العناصر الفرعية (مثل: البلد، المركز، المحافظة)</Label>
                  
                  {newFieldSubFields.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newFieldSubFields.map((sf, index) => (
                        <div
                          key={sf.id}
                          className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded-lg text-xs"
                        >
                          <span className="text-primary">{sf.name}</span>
                          <button
                            type="button"
                            onClick={() => setNewFieldSubFields(newFieldSubFields.filter((_, i) => i !== index))}
                            className="text-muted-foreground hover:text-accent"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Input
                      value={newSubFieldName}
                      onChange={(e) => setNewSubFieldName(e.target.value)}
                      placeholder="اسم العنصر (مثال: المحافظة)"
                      className="bg-input/50 border-border/50 text-right flex-1"
                      dir="rtl"
                      maxLength={30}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (newSubFieldName.trim()) {
                          setNewFieldSubFields([
                            ...newFieldSubFields,
                            { id: generateId(), name: newSubFieldName.trim() }
                          ]);
                          setNewSubFieldName('');
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Yearly Batches Start Year */}
              {newFieldType === 'yearlyBatches' && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">سنة البداية</Label>
                  <Input
                    type="number"
                    value={newFieldStartYear}
                    onChange={(e) => setNewFieldStartYear(Number(e.target.value))}
                    placeholder="مثال: 2023"
                    className="bg-input/50 border-border/50 text-right"
                    dir="rtl"
                    min={2000}
                    max={new Date().getFullYear()}
                  />
                  <p className="text-xs text-muted-foreground">
                    سيتم إنشاء حقول من {newFieldStartYear} حتى السنة الحالية ({new Date().getFullYear()})
                  </p>
                </div>
              )}

              {/* Selectable Batches */}
              {newFieldType === 'selectableBatches' && (
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">الدفعات المتاحة (مثل: 2023، 2024، 2025)</Label>
                  
                  {newFieldBatches.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newFieldBatches.map((batch, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded-lg text-xs"
                        >
                          <span className="text-primary">{batch}</span>
                          <button
                            type="button"
                            onClick={() => setNewFieldBatches(newFieldBatches.filter((_, i) => i !== index))}
                            className="text-muted-foreground hover:text-accent"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Input
                      value={newBatchName}
                      onChange={(e) => setNewBatchName(e.target.value)}
                      placeholder="اسم الدفعة (مثال: 2023)"
                      className="bg-input/50 border-border/50 text-right flex-1"
                      dir="rtl"
                      maxLength={30}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (newBatchName.trim() && !newFieldBatches.includes(newBatchName.trim())) {
                          setNewFieldBatches([...newFieldBatches, newBatchName.trim()]);
                          setNewBatchName('');
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    المستخدم سيختار دفعة واحدة ويضيف بيانات لها
                  </p>
                </div>
              )}

              {/* Quarterly Investigations Settings */}
              {newFieldType === 'quarterlyInvestigations' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">سنة البداية</Label>
                    <Input
                      type="number"
                      value={newFieldStartYear}
                      onChange={(e) => setNewFieldStartYear(Number(e.target.value))}
                      placeholder="مثال: 2023"
                      className="bg-input/50 border-border/50 text-right"
                      dir="rtl"
                      min={2000}
                      max={new Date().getFullYear()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">عدد السنوات</Label>
                    <div className="flex gap-2">
                      {[2, 3, 4, 5, 6].map(count => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setNewFieldYearsCount(count)}
                          className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                            newFieldYearsCount === count
                              ? 'border-primary bg-primary/20 text-primary'
                              : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          {count} سنوات
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-lg border border-border/30">
                    <p className="text-xs text-muted-foreground mb-2">
                      سيتم إنشاء حقول للفترات التالية لكل سنة:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">شهر 1 (يناير)</Badge>
                      <Badge variant="outline" className="text-xs">شهر 4 (أبريل)</Badge>
                      <Badge variant="outline" className="text-xs">شهر 7 (يوليو)</Badge>
                      <Badge variant="outline" className="text-xs">شهر 10 (أكتوبر)</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      الفترة: {newFieldStartYear} إلى {newFieldStartYear + newFieldYearsCount - 1}
                    </p>
                  </div>
                </div>
              )}

              {/* Custom Table Columns */}
              {newFieldType === 'customTable' && (
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground flex items-center justify-between">
                    <span>أعمدة الجدول</span>
                    <span className="text-[11px] text-muted-foreground">
                      (إعدادات التصميم للأدمن فقط – المستخدم يدخل بيانات فقط)
                    </span>
                  </Label>
                  
                  {newFieldColumns.length > 0 && (
                    <div className="space-y-2">
                      {newFieldColumns.map((col, index) => (
                        <div
                          key={col.id}
                          className="flex items-center justify-between p-2 bg-primary/10 border border-primary/30 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-primary font-medium">{col.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {col.type === 'text'
                                ? 'نص'
                                : col.type === 'number'
                                ? 'رقم'
                                : col.type === 'date'
                                ? 'تاريخ'
                                : 'مركب'}
                            </Badge>
                            {col.options && col.options.length > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                قائمة اختيار
                              </Badge>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setNewFieldColumns(newFieldColumns.filter((_, i) => i !== index))}
                            className="text-muted-foreground hover:text-accent"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">اسم العمود</Label>
                        <Input
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                          placeholder="مثال: الاسم"
                          className="bg-input/50 border-border/50 text-right"
                          dir="rtl"
                          maxLength={30}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">نوع العمود</Label>
                        <div className="flex gap-1">
                          {(['text', 'number', 'date', 'compound'] as const).map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setNewColumnType(type)}
                              className={`px-3 py-2 rounded-lg border text-xs transition-all ${
                                newColumnType === type
                                  ? 'border-primary bg-primary/20 text-primary'
                                  : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'
                              }`}
                            >
                              {type === 'text'
                                ? 'نص عادي'
                                : type === 'number'
                                ? 'رقم'
                                : type === 'date'
                                ? 'تاريخ'
                                : 'مجموعة أعمدة (مثل: رقم / تاريخ)'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (!newColumnName.trim()) return;

                          if (newColumnType === 'compound' && newColumnSubColumns.length === 0) {
                            setError('العمود المركب يتطلب عمودين فرعيين على الأقل');
                            return;
                          }

                          const parsedOptions = newColumnOptions
                            .split(',')
                            .map(o => o.trim())
                            .filter(Boolean);

                          const baseColumn: TableColumn = {
                            id: generateId(),
                            name: newColumnName.trim(),
                            type: newColumnType,
                            ...(newColumnType === 'compound' && { subColumns: newColumnSubColumns }),
                            ...(newColumnType !== 'compound' && parsedOptions.length > 0 && { options: parsedOptions }),
                          };

                          setNewFieldColumns([...newFieldColumns, baseColumn]);
                          setNewColumnName('');
                          setNewColumnSubColumns([]);
                          setNewTableSubColumnName('');
                          setNewTableSubColumnType('text');
                          setNewColumnOptions('');
                          setError('');
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {newColumnType === 'compound' && (
                      <div className="space-y-3 mt-2 p-3 bg-secondary/20 rounded-lg border border-border/40">
                        <Label className="text-xs text-muted-foreground">
                          الأعمدة الفرعية داخل هذا العمود (مثال:- تاريخ / رقم)
                        </Label>
                        {newColumnSubColumns.length > 0 && (
                          <div className="space-y-1">
                            {newColumnSubColumns.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between px-2 py-1 bg-secondary/40 rounded-md border border-border/40"
                              >
                                <span className="text-xs text-foreground">{sub.name}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px]">
                                    {sub.type === 'text' ? 'نص' : sub.type === 'number' ? 'رقم' : 'تاريخ'}
                                  </Badge>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNewColumnSubColumns(prev => prev.filter(c => c.id !== sub.id))
                                    }
                                    className="text-muted-foreground hover:text-accent"
                                  >
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
                            <Input
                              value={newTableSubColumnName}
                              onChange={(e) => setNewTableSubColumnName(e.target.value)}
                              placeholder="مثال:رقم"
                              className="bg-input/50 border-border/50 text-right"
                              dir="rtl"
                              maxLength={30}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">النوع</Label>
                            <div className="flex gap-1">
                              {(['text', 'number', 'date'] as const).map(type => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => setNewTableSubColumnType(type)}
                                  className={`px-3 py-2 rounded-lg border text-xs transition-all ${
                                    newTableSubColumnType === type
                                      ? 'border-primary bg-primary/20 text-primary'
                                      : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'
                                  }`}
                                >
                                  {type === 'text' ? 'نص' : type === 'number' ? 'رقم' : 'تاريخ'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (!newTableSubColumnName.trim()) return;
                              setNewColumnSubColumns(prev => [
                                ...prev,
                                {
                                  id: generateId(),
                                  name: newTableSubColumnName.trim(),
                                  type: newTableSubColumnType,
                                },
                              ]);
                              setNewTableSubColumnName('');
                              setNewTableSubColumnType('text');
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          سيتم عرض رأس العمود كعنوان رئيسي مع أعمدة فرعية تحته (colspan ديناميكي).
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNewColumnSubColumns([
                                { id: generateId(), name: 'رقم', type: 'number' },
                                { id: generateId(), name: 'التاريخ', type: 'date' },
                              ]);
                            }}
                          >
                            استخدام قالب جاهز: رقم / التاريخ
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNewColumnSubColumns([]);
                            }}
                          >
                            مسح الأعمدة الفرعية
                          </Button>
                        </div>
                      </div>
                    )}

                    {newColumnType !== 'compound' && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          خيارات هذا العمود (اختياري - افصل القيم بفاصلة)
                        </Label>
                        <Input
                          value={newColumnOptions}
                          onChange={(e) => setNewColumnOptions(e.target.value)}
                          placeholder="مثال: وارد, صادر, محفوظ"
                          className="bg-input/50 border-border/50 text-right"
                          dir="rtl"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          عند إضافة خيارات، تظهر خلايا هذا العمود كقائمة اختيار بدلاً من حقل نصي.
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    سيتمكن المستخدم من إضافة صفوف متعددة في هذا الجدول
                  </p>

                  <div className="mt-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      نماذج جاهزة للصفوف (اختياري)
                    </Label>
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <button
                        type="button"
                        onClick={() =>
                          setNewFieldRowTemplate(
                            newFieldRowTemplate === 'monthsOfYear' ? null : 'monthsOfYear'
                          )
                        }
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          newFieldRowTemplate === 'monthsOfYear'
                            ? 'bg-primary border-primary'
                            : 'border-border/50 bg-secondary/30'
                        }`}
                      >
                        {newFieldRowTemplate === 'monthsOfYear' && (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </button>
                      <span>
                        إنشاء صفوف تلقائيًا لكل شهور السنة (يناير إلى ديسمبر) في أول عمود
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setNewFieldRequired(!newFieldRequired)}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    newFieldRequired 
                      ? 'bg-primary border-primary' 
                      : 'border-border/50 bg-secondary/30'
                  }`}
                >
                  {newFieldRequired && <Check className="w-3 h-3 text-primary-foreground" />}
                </button>
                <span className="text-sm text-foreground">حقل مطلوب</span>
              </label>

              {/* Add Field Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddField}
                className="w-full"
              >
                <Plus className="w-4 h-4 ml-2" />
                إضافة الحقل
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                السابق
              </Button>
              <Button
                type="submit"
                style={{ 
                  background: 'var(--gradient-gold)',
                  boxShadow: 'var(--shadow-gold)' 
                }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  "إنشاء الدفتر"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateNotebookDialog;