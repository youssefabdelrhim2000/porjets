import { Type, Hash, AlignLeft, Image, ListChecks, Calendar, Layers, CalendarRange, Table, CalendarDays } from 'lucide-react';
import type { FieldType } from '@/types/notebook';

export const FIELD_TYPES: { value: FieldType; label: string; icon: React.ElementType; description?: string }[] = [
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
  { value: 'flexibleTable', label: 'جدول مرن', icon: Table, description: 'جدول يمكنك التحكم بأعمدته بحرية' },
  { value: 'customTable', label: 'جدول مخصص', icon: Table, description: 'جدول بأعمدة مخصصة وصفوف ديناميكية' },
  { value: 'monthlyData', label: 'بيانات شهرية', icon: CalendarDays, description: 'تعبئة بيانات لكل شهر' },
];

export const ICON_MAP: Record<string, React.ElementType> = {
  book: Book,
  users: Users,
  car: Car,
  building: Building,
  shield: Shield,
  file: FileText,
  clipboard: ClipboardList,
  map: Map,
};

export const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2);