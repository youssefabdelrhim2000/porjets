import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ArrowRight, Search, Plus, Book, X, Folder, Upload, Loader2, Save, Type,
  Hash, AlignLeft, Image as ImageIcon, ListChecks, Calendar, Table, CalendarDays, Trash2
} from 'lucide-react';

import api from '@/lib/axios';
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from '@/hooks/useDebounce';

import type { Notebook, NotebookEntry, FieldDefinition, FieldType, FlexibleTableValue } from '@/types/notebook';
import FileImportDialog from './FileImportDialog';
import { FlexibleTableField } from './fields/FlexibleTableField';
import { NotebookEntryCard } from '@/components/notebook/NotebookEntryCard'; 
import { flattenCellData, buildPrintableHtml } from '@/utils/notebookHelpers';

const FIELD_TYPE_ICONS: Record<FieldType, React.ElementType> = {
  text: Type, number: Hash, textarea: AlignLeft, image: ImageIcon, choice: ListChecks, date: Calendar,
  compound: Type, yearlyBatches: Calendar, selectableBatches: ListChecks, quarterlyInvestigations: Calendar,
  customTable: Table, flexibleTable: Table, monthlyData: CalendarDays,
};

interface NotebookViewProps {
  notebookId: string;
  onBack: () => void;
}

const NotebookView: React.FC<NotebookViewProps> = ({ notebookId, onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<NotebookEntry | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, pageSize]);

  // جلب الدفتر
  const { data: notebookRaw, isLoading: isLoadingNotebook } = useQuery({
    queryKey: ['notebook', notebookId],
    queryFn: async () => {
      const response = await api.get(`/notebooks/${notebookId}`);
      return response.data.data || response.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // تحويل fields من string لـ array لو لزم
  const notebook = useMemo(() => {
    if (!notebookRaw) return null;
    let fields: FieldDefinition[] = [];
    if (typeof notebookRaw.fields === 'string') {
      try { fields = JSON.parse(notebookRaw.fields); } catch { fields = []; }
    } else if (Array.isArray(notebookRaw.fields)) {
      fields = notebookRaw.fields;
    }
    return { ...notebookRaw, fields };
  }, [notebookRaw]);

  // جلب السجلات
  const { data: entriesResponse, isLoading: isLoadingEntries } = useQuery({
    queryKey: ['entries', notebookId, currentPage, pageSize, debouncedSearch],
    queryFn: async () => {
      const response = await api.get(`/notebooks/${notebookId}/entries`, {
        params: {
          page: currentPage,
          per_page: pageSize,
          search: debouncedSearch || undefined,
        },
      });
      return {
        data: response.data?.data || [],
        meta: response.data?.meta || null,
      };
    },
    enabled: !!notebook,
  });

  const filteredEntries = useMemo(() => entriesResponse?.data || [], [entriesResponse?.data]);
  const totalPages = entriesResponse?.meta?.last_page || 1;
  const totalEntries = entriesResponse?.meta?.total ?? filteredEntries.length;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: { notebook_id: string; data: Record<string, any>; entryId?: string }) => {
      if (payload.entryId) return await api.put(`/entries/${payload.entryId}`, payload);
      return await api.post(`/notebooks/${payload.notebook_id}/entries`, { data: payload.data });
    },
    onSuccess: () => {
      handleCloseDialog();
      toast({ title: editingEntry ? "تم التعديل بنجاح" : "تمت الإضافة بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل الحفظ", variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['entries', notebookId] })
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => await api.delete(`/entries/${entryId}`),
    onSuccess: () => toast({ title: "تم الحذف بنجاح" }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['entries', notebookId] })
  });

  // Handlers
  const handleOpenAdd = () => { setFormData({}); setError(''); setIsAddOpen(true); };
  
  const handleOpenEdit = useCallback((entry: NotebookEntry) => {
    setFormData({ ...entry.data });
    setError('');
    setEditingEntry(entry);
    setIsAddOpen(true);
  }, []);

  const handleCloseDialog = () => {
    setIsAddOpen(false);
    setEditingEntry(null);
    setFormData({});
    setError('');
  };

  const handleFieldChange = useCallback((fieldId: string, value: unknown) =>
    setFormData(prev => ({ ...prev, [fieldId]: value })), []);

  const handleImageUpload = (fieldId: string, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    api.post('/entries/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => {
        const imageUrl = res.data?.data?.url;
        if (imageUrl) handleFieldChange(fieldId, imageUrl);
        else toast({ title: "خطأ", description: "فشل رفع الصورة", variant: "destructive" });
      })
      .catch(() => toast({ title: "خطأ", description: "فشل رفع الصورة", variant: "destructive" }));
  };

  const handleSaveEntry = () => {
    if (!notebook) return;
    const missingFields = notebook.fields.filter((f: FieldDefinition) => f.required && !formData[f.id]);
    if (missingFields.length > 0) {
      setError(`يرجى ملء الحقول المطلوبة: ${missingFields.map((f: FieldDefinition) => f.name).join('، ')}`);
      return;
    }
    setError('');
    saveMutation.mutate({
      notebook_id: notebook.id,
      data: formData,
      entryId: editingEntry?.id
    });
  };

  const handleDeleteEntry = useCallback((entryId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    deleteMutation.mutate(entryId);
  }, [deleteMutation]);

  const handlePrintEntry = useCallback((entry: NotebookEntry) => {
    try {
      const html = buildPrintableHtml(entry, notebook!);
      if (!html) return;
      const printWindow = window.open('', '_blank', 'width=900,height=650');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الطباعة', variant: 'destructive' });
    }
  }, [notebook, toast]);

  // Render Field Input
  const renderFieldInput = useCallback((field: FieldDefinition) => {
    const value = formData[field.id] ?? '';

    if (field.type === 'customTable' || field.type === 'flexibleTable') {
      return (
        <div className="w-full border border-border/50 rounded-lg p-1 mt-2">
          <FlexibleTableField
            field={field}
            value={value as FlexibleTableValue}
            onChange={(v) => handleFieldChange(field.id, v)}
          />
        </div>
      );
    }

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || `أدخل ${field.name}`}
            className="bg-input/50 border-border/50 text-right resize-none"
            dir="rtl"
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              const nv = e.target.value.replace(/\D/g, '');
              if (field.maxLength && nv.length > field.maxLength) return;
              handleFieldChange(field.id, nv);
            }}
            placeholder={field.placeholder || `أدخل ${field.name}`}
            className="bg-input/50 border-border/50 text-right"
            dir="rtl"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-input/50 border-border/50"
          />
        );

      case 'image':
        return (
          <div className="space-y-2">
            {value && (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border/50">
                <img src={value} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleFieldChange(field.id, '')}
                  className="absolute top-1 right-1 p-1 bg-accent text-accent-foreground rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(field.id, file);
              }}
              className="bg-input/50 border-border/50"
            />
          </div>
        );

      case 'choice':
        return (
          <div className="flex flex-wrap gap-2">
            {field.options?.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => handleFieldChange(field.id, opt)}
                className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                  value === opt
                    ? 'border-primary bg-primary/20 text-primary'
                    : 'border-border/50 bg-secondary/30 text-muted-foreground'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        );

      case 'compound': {
        const compVal: Record<string, string> =
          typeof value === 'object' && value !== null ? (value as Record<string, string>) : {};
        return (
          <div className="flex flex-wrap gap-3">
            {(field.subFields || []).map(sf => (
              <div key={sf.id} className="flex-1 min-w-[120px] space-y-1">
                <Input
                  type="text"
                  value={compVal[sf.id] || ''}
                  onChange={(e) =>
                    handleFieldChange(field.id, { ...compVal, [sf.id]: e.target.value })
                  }
                  placeholder={sf.name}
                  className="bg-input/50 border-border/50 text-right text-sm"
                  dir="rtl"
                />
                <span className="text-xs text-muted-foreground block">{sf.name}</span>
              </div>
            ))}
          </div>
        );
      }

      case 'yearlyBatches': {
        const ybVal: Record<number, string> =
          typeof value === 'object' && value !== null ? (value as Record<number, string>) : {};
        const ybYears = Array.from(
          { length: new Date().getFullYear() - (field.startYear || 2023) + 1 },
          (_, i) => (field.startYear || 2023) + i
        );
        return (
          <div className="space-y-2">
            {ybYears.map(year => (
              <div key={year} className="flex items-center gap-3">
                <Badge variant="secondary" className="min-w-[60px] justify-center">{year}</Badge>
                <Input
                  type="text"
                  value={ybVal[year] || ''}
                  onChange={(e) => handleFieldChange(field.id, { ...ybVal, [year]: e.target.value })}
                  placeholder={`بيانات ${year}`}
                  className="bg-input/50 border-border/50 text-right flex-1"
                  dir="rtl"
                />
              </div>
            ))}
          </div>
        );
      }

      case 'selectableBatches': {
        const sbVal: { batch: string; data: string } =
          typeof value === 'object' && value !== null
            ? (value as { batch: string; data: string })
            : { batch: '', data: '' };
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(field.batches || []).map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleFieldChange(field.id, { ...sbVal, batch: b })}
                  className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                    sbVal.batch === b
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border/50 bg-secondary/30'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            {sbVal.batch && (
              <Input
                type="text"
                value={sbVal.data || ''}
                onChange={(e) => handleFieldChange(field.id, { ...sbVal, data: e.target.value })}
                placeholder={`بيانات ${sbVal.batch}`}
                className="bg-input/50 border-border/50 text-right"
                dir="rtl"
              />
            )}
          </div>
        );
      }

      case 'quarterlyInvestigations': {
        const qiVal: Record<number, Record<string, string>> =
          typeof value === 'object' && value !== null
            ? (value as Record<number, Record<string, string>>)
            : {};
        const qiYears = Array.from(
          { length: field.yearsCount || 4 },
          (_, i) => (field.startYear || 2023) + i
        );
        const quarters = [
          { key: 'q1', l: 'شهر 1', m: 'يناير' },
          { key: 'q4', l: 'شهر 4', m: 'أبريل' },
          { key: 'q7', l: 'شهر 7', m: 'يوليو' },
          { key: 'q10', l: 'شهر 10', m: 'أكتوبر' },
        ];
        return (
          <div className="space-y-4">
            {qiYears.map(year => (
              <div key={year} className="p-3 bg-secondary/20 rounded-lg border border-border/30">
                <Badge variant="secondary" className="font-bold mb-3">{year}</Badge>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {quarters.map(q => (
                    <div key={q.key} className="space-y-1">
                      <label className="text-xs text-muted-foreground block">{q.l}</label>
                      <Input
                        type="text"
                        value={(qiVal[year] || {})[q.key] || ''}
                        onChange={(e) =>
                          handleFieldChange(field.id, {
                            ...qiVal,
                            [year]: { ...(qiVal[year] || {}), [q.key]: e.target.value },
                          })
                        }
                        placeholder={q.m}
                        className="bg-input/50 border-border/50 text-right text-sm h-9"
                        dir="rtl"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      }

      case 'monthlyData': {
        const mdVal: Record<number, string> =
          typeof value === 'object' && value !== null ? (value as Record<number, string>) : {};
        const months = [
          { k: 1, n: 'يناير' }, { k: 2, n: 'فبراير' }, { k: 3, n: 'مارس' },
          { k: 4, n: 'أبريل' }, { k: 5, n: 'مايو' }, { k: 6, n: 'يونيو' },
          { k: 7, n: 'يوليو' }, { k: 8, n: 'أغسطس' }, { k: 9, n: 'سبتمبر' },
          { k: 10, n: 'أكتوبر' }, { k: 11, n: 'نوفمبر' }, { k: 12, n: 'ديسمبر' },
        ];
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {months.map(m => (
              <div key={m.k} className="flex items-center gap-2">
                <Badge variant="secondary" className="min-w-[70px] justify-center text-xs">{m.n}</Badge>
                <Input
                  type="text"
                  value={mdVal[m.k] || ''}
                  onChange={(e) => handleFieldChange(field.id, { ...mdVal, [m.k]: e.target.value })}
                  placeholder={`بيانات ${m.n}`}
                  className="bg-input/50 border-border/50 text-right flex-1 h-9"
                  dir="rtl"
                />
              </div>
            ))}
          </div>
        );
      }

      case 'customTable': {
        const ctVal: Record<string, string>[] = Array.isArray(value) ? value : [];
        const ctCols = field.columns || [];
        return (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-3 py-2 w-10">#</th>
                    {ctCols.map(c => <th key={c.id} className="px-3 py-2 text-right">{c.name}</th>)}
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {ctVal.map((row, i) => (
                    <tr key={i} className="border-t border-border/30">
                      <td className="px-3 py-2 text-center">{i + 1}</td>
                      {ctCols.map(c => (
                        <td key={c.id} className="px-2 py-1">
                          <Input
                            type={c.type === 'number' ? 'number' : 'text'}
                            value={row[c.id] || ''}
                            onChange={(e) => {
                              const newRows = [...ctVal];
                              newRows[i] = { ...newRows[i], [c.id]: e.target.value };
                              handleFieldChange(field.id, newRows);
                            }}
                            className="bg-input/50 border-border/50 text-right h-8 text-sm"
                            dir="rtl"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1">
                        <button
                          type="button"
                          onClick={() => handleFieldChange(field.id, ctVal.filter((_, idx) => idx !== i))}
                          className="p-1 text-muted-foreground hover:text-accent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newRow: Record<string, string> = {};
                ctCols.forEach(c => { newRow[c.id] = ''; });
                handleFieldChange(field.id, [...ctVal, newRow]);
              }}
              className="w-full"
            >
              <Plus className="w-4 h-4 ml-2" />إضافة صف
            </Button>
          </div>
        );
      }

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || `أدخل ${field.name}`}
            className="bg-input/50 border-border/50 text-right"
            dir="rtl"
            maxLength={field.maxLength}
          />
        );
    }
  }, [formData, handleFieldChange]);

  const renderFieldValue = useCallback((field: FieldDefinition, value: any) => {
    if (!value) return <span className="text-muted-foreground">—</span>;
    if (field.type === 'image') return <img src={value} alt="" className="w-20 h-20 object-cover rounded-lg border border-border/50" />;
    if (field.type === 'date') return new Date(value).toLocaleDateString('ar-EG');

    if (field.type === 'compound' && typeof value === 'object') {
      return (
        <span>
          {(field.subFields || []).map(sf => value[sf.id]).filter(Boolean).join(' / ')}
        </span>
      );
    }

    if (field.type === 'customTable' || field.type === 'flexibleTable') {
      let cols: any[] = [];
      let rows: any[] = [];
      if (Array.isArray(value)) { rows = value; cols = field.columns || []; }
      else if (typeof value === 'object' && value !== null) { cols = value.columns || []; rows = value.rows || []; }
      if (!cols.length && !rows.length) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-3 py-2 w-10">#</th>
                {cols.map(c => <th key={c.id} className="px-3 py-2 text-right">{c.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0
                ? <tr><td colSpan={cols.length + 1} className="px-3 py-4 text-center">لا توجد بيانات</td></tr>
                : rows.map((r, i) => (
                  <tr key={i} className="border-t border-border/30">
                    <td className="px-3 py-2 text-center">{i + 1}</td>
                    {cols.map(c => <td key={c.id} className="px-2 py-1 text-right">{flattenCellData(r[c.id]) || '—'}</td>)}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      );
    }

    return <span className="line-clamp-2">{typeof value === 'object' ? flattenCellData(value) : String(value)}</span>;
  }, []);

  if (isLoadingNotebook) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl shrink-0">
        <div className="container mx-auto px-4 lg:px-8 h-16 lg:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowRight className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-foreground">{notebook?.name}</h1>
              <p className="text-xs text-muted-foreground">{totalEntries} سجل</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <Upload className="w-4 h-4 ml-2" />استيراد
              </Button>
            )}
            <Button onClick={handleOpenAdd} style={{ background: 'var(--gradient-gold)' }}>
              <Plus className="w-4 h-4 ml-2" />إضافة سجل
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 lg:px-8 py-6 flex-1 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
        <div className="relative max-w-xl mb-6 shrink-0">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="البحث في السجلات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-12 h-12 bg-card/50 border-border/50 text-right"
            dir="rtl"
          />
        </div>

        {isLoadingEntries ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-16 bg-card/30 rounded-2xl border border-border/30 m-auto">
            <Book className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">لا توجد نتائج</h3>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
              <div className="space-y-3">
                {filteredEntries.map((entry) => (
                  <NotebookEntryCard
                    key={entry.id}
                    entry={entry}
                    notebook={notebook}
                    isExpanded={expandedEntryId === entry.id}
                    isAdmin={isAdmin}
                    onToggle={() => setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)}
                    onPrint={handlePrintEntry}
                    onEdit={handleOpenEdit}
                    onDelete={handleDeleteEntry}
                    renderFieldValue={renderFieldValue}
                  />
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className="mt-4 pt-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>عرض</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-card border border-border/50 rounded-md px-2 py-1 text-foreground focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                  dir="rtl"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                </select>
                <span>سجل من إجمالي {totalEntries}</span>
              </div>
              <div className="flex items-center gap-2" dir="ltr">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>السابق</Button>
                <div className="flex items-center gap-1 px-3 text-sm font-medium bg-secondary/50 rounded-md py-1">
                  <span className="text-foreground">{currentPage}</span>
                  <span className="text-muted-foreground mx-1">من</span>
                  <span className="text-muted-foreground">{totalPages}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>التالي</Button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Dialog */}
      <Dialog open={isAddOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingEntry ? 'تعديل السجل' : 'إضافة سجل جديد'}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg text-accent text-sm">{error}</div>
          )}

          <form className="space-y-6 py-4" onSubmit={(e) => { e.preventDefault(); handleSaveEntry(); }}>
            <div className="space-y-6">
              {(() => {
                const fieldsList = notebook?.fields || [];
                if (fieldsList.length === 0) {
                  return (
                    <div className="text-center py-12 text-muted-foreground">
                      <Book className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>لا توجد حقول في هذا الدفتر</p>
                    </div>
                  );
                }
                const sections = [...new Set(fieldsList.map((f: FieldDefinition) => f.section || 'بيانات أساسية'))];
                return sections.map((section) => {
                  const sectionFields = fieldsList.filter((f: FieldDefinition) => (f.section || 'بيانات أساسية') === section);
                  return (
                    <div key={section} className="space-y-4 border-b border-border/30 pb-6 last:border-0">
                      <div className="text-sm text-primary font-bold flex items-center gap-2">
                        <Folder className="w-4 h-4" />{section}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                        {sectionFields.map((field: FieldDefinition) => {
                          const FieldIcon = FIELD_TYPE_ICONS[field.type] || Type;
                          const isFullWidth = ['customTable', 'flexibleTable', 'textarea', 'yearlyBatches', 'image', 'compound', 'quarterlyInvestigations', 'monthlyData'].includes(field.type);
                          const colSpan = isFullWidth ? 'lg:col-span-12 md:col-span-2' : 'lg:col-span-4 md:col-span-1';
                          return (
                            <div key={field.id} className={`${colSpan} space-y-2`}>
                              <Label className="text-foreground flex items-center gap-2 text-sm">
                                {React.createElement(FieldIcon, { className: "w-4 h-4 text-primary" })}
                                {field.name}
                                {field.required && <span className="text-accent">*</span>}
                              </Label>
                              {renderFieldInput(field)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border/30">
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={saveMutation.isPending}>إلغاء</Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="min-w-[120px]"
                style={{ background: 'var(--gradient-gold)', boxShadow: 'var(--shadow-gold)' }}
              >
                {saveMutation.isPending
                  ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الحفظ...</>
                  : <><Save className="w-4 h-4 ml-2" />{editingEntry ? 'حفظ التغييرات' : 'إضافة'}</>
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {isAdmin && notebook && (
        <FileImportDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          notebook={notebook}
          userId={user?.id || ''}
          userInfo={{ userId: user?.id || '', username: user?.username || '', displayName: user?.display_name || '' }}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['entries', notebookId] })}
        />
      )}
    </div>
  );
};

export default NotebookView;