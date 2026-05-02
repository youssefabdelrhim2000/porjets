import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';
import axios from 'axios';

// --- Types ---
export type DocumentCategory = 'افراد' | 'معاونين' | 'مجندين';

export interface DocumentYear {
  id: number;
  year: number;
}

export interface DocumentBatch {
  id: number;
  year_id: number;
  batch_number: number;
  name: string;
}

export interface DocumentItem {
  id: number;
  category: DocumentCategory;
  batch_id: number | null;
  person_name: string;
  file_name: string;
  file_path: string;
  file_type: string;
  url: string;
}

export interface FetchDocumentsParams {
  category?: string;
  batch_id?: number;
  year_id?: number;
  search?: string;
}

// --- The Hook ---
export function useDocumentManager() {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [searchParams, setSearchParams] = useSearchParams();

  const handleApiError = useCallback((error: unknown, defaultMessage: string) => {
    let msg = defaultMessage;
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 413) msg = 'حجم الملف كبير جداً على السيرفر.';
      else if (error.response?.status === 422) msg = 'تأكد من إدخال البيانات بشكل صحيح.';
      else if (error.response?.status === 404) msg = 'هذا العنصر غير موجود، ربما تم حذفه.';
      else msg = error.response?.data?.message || defaultMessage;
    }
    toastRef.current({ title: 'خطأ', description: msg, variant: 'destructive' });
  }, []);

  const categoryParam = searchParams.get('category') as DocumentCategory | null;
  const yearIdParam = searchParams.get('year');
  const batchIdParam = searchParams.get('batch');

  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | null>(categoryParam);
  const [selectedYear, setSelectedYear] = useState<number | null>(yearIdParam ? parseInt(yearIdParam) : null);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(batchIdParam ? parseInt(batchIdParam) : null);

  const [years, setYears] = useState<DocumentYear[]>([]);
  const [batches, setBatches] = useState<DocumentBatch[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<DocumentItem[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedYear) params.set('year', selectedYear.toString());
    if (selectedBatch) params.set('batch', selectedBatch.toString());
    setSearchParams(params, { replace: true });
  }, [selectedCategory, selectedYear, selectedBatch, setSearchParams]);

  // Global search debounce - 300ms بدل 500ms
  useEffect(() => {
    if (!globalSearchQuery.trim()) {
      setGlobalSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const response = await api.get('/documents', { params: { search: globalSearchQuery } });
        setGlobalSearchResults(response.data.data || []);
      } catch (error) {
        handleApiError(error, 'فشل في عملية البحث العام');
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [globalSearchQuery, handleApiError]);

  // ============================================================
  // FETCH ACTIONS
  // ============================================================

  const fetchYears = useCallback(async () => {
    try {
      const response = await api.get('/years');
      setYears(response.data.data || []);
    } catch (error) {
      handleApiError(error, 'فشل في تحميل السنوات');
    }
  }, [handleApiError]);

  const fetchBatches = useCallback(async (yearId: number) => {
    try {
      const response = await api.get(`/years/${yearId}/batches`);
      setBatches(response.data.data || []);
    } catch (error) {
      handleApiError(error, 'فشل في تحميل الدفعات');
    }
  }, [handleApiError]);

  const fetchDocuments = useCallback(async () => {
    if (!selectedCategory || (selectedCategory === 'مجندين' && !selectedBatch)) {
      setDocuments(prev => (prev.length === 0 ? prev : []));
      return;
    }
    setIsLoading(true);
    try {
      const params: FetchDocumentsParams = { category: selectedCategory };
      if (selectedBatch) params.batch_id = selectedBatch;
      if (selectedYear) params.year_id = selectedYear;
      const response = await api.get('/documents', { params });
      setDocuments(response.data.data || []);
    } catch (error) {
      handleApiError(error, 'فشل في تحميل الوثائق');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedBatch, selectedYear, handleApiError]);

  // ============================================================
  // YEAR ACTIONS — كلها useCallback + optimistic update
  // ============================================================

  const addYear = useCallback(async (year: string, onSuccess: () => void) => {
    const parsed = parseInt(year);
    // Optimistic: أضف السنة فوراً
    const tempId = Date.now();
    const tempYear: DocumentYear = { id: tempId, year: parsed };
    setYears(prev => [...prev, tempYear]);
    onSuccess();

    try {
      const response = await api.post('/years', { year: parsed });
      const newYear = response.data.data || response.data;
      // استبدل الـ temp بالحقيقي
      setYears(prev => prev.map(y => y.id === tempId ? newYear : y));
      toastRef.current({ title: 'تم', description: 'تمت إضافة السنة بنجاح' });
    } catch (error) {
      // rollback
      setYears(prev => prev.filter(y => y.id !== tempId));
      handleApiError(error, 'فشل إضافة السنة');
    }
  }, [handleApiError]);

  const editYear = useCallback(async (id: number, year: string, onSuccess: () => void) => {
    const parsed = parseInt(year);
    // Optimistic: عدّل فوراً
    setYears(prev => prev.map(y => y.id === id ? { ...y, year: parsed } : y));
    onSuccess();

    try {
      await api.put(`/years/${id}`, { year: parsed });
      toastRef.current({ title: 'تم', description: 'تم تعديل السنة بنجاح' });
    } catch (error) {
      // rollback
      fetchYears();
      handleApiError(error, 'فشل تعديل السنة');
    }
  }, [handleApiError, fetchYears]);

  const deleteYear = useCallback(async (id: number, onSuccess: () => void) => {
    // Optimistic: احذف فوراً
    const backup = years;
    setYears(prev => prev.filter(y => y.id !== id));
    onSuccess();

    try {
      await api.delete(`/years/${id}`);
      toastRef.current({ title: 'تم', description: 'تم حذف السنة بنجاح' });
    } catch (error) {
      // rollback
      setYears(backup);
      handleApiError(error, 'فشل حذف السنة');
    }
  }, [handleApiError, years]);

  // ============================================================
  // BATCH ACTIONS — كلها useCallback + optimistic update
  // ============================================================

  const addBatch = useCallback(async (name: string, onSuccess: () => void) => {
    if (!selectedYear) return;
    const tempId = Date.now();
    const tempBatch: DocumentBatch = { id: tempId, year_id: selectedYear, batch_number: 0, name };
    setBatches(prev => [...prev, tempBatch]);
    onSuccess();

    try {
      const response = await api.post('/batches', { year_id: selectedYear, name });
      const newBatch = response.data.data || response.data;
      setBatches(prev => prev.map(b => b.id === tempId ? newBatch : b));
      toastRef.current({ title: 'تم', description: 'تمت إضافة الدفعة بنجاح' });
    } catch (error) {
      setBatches(prev => prev.filter(b => b.id !== tempId));
      handleApiError(error, 'فشل إضافة الدفعة');
    }
  }, [selectedYear, handleApiError]);

  const editBatch = useCallback(async (id: number, name: string, onSuccess: () => void) => {
    if (!selectedYear) return;
    setBatches(prev => prev.map(b => b.id === id ? { ...b, name } : b));
    onSuccess();

    try {
      await api.put(`/batches/${id}`, { name });
      toastRef.current({ title: 'تم', description: 'تم تعديل الدفعة بنجاح' });
    } catch (error) {
      fetchBatches(selectedYear);
      handleApiError(error, 'فشل تعديل الدفعة');
    }
  }, [selectedYear, handleApiError, fetchBatches]);

  const deleteBatch = useCallback(async (id: number, onSuccess: () => void) => {
    if (!selectedYear) return;
    const backup = batches;
    setBatches(prev => prev.filter(b => b.id !== id));
    onSuccess();

    try {
      await api.delete(`/batches/${id}`);
      toastRef.current({ title: 'تم', description: 'تم حذف الدفعة بنجاح' });
    } catch (error) {
      setBatches(backup);
      handleApiError(error, 'فشل حذف الدفعة');
    }
  }, [selectedYear, handleApiError, batches]);

  // ============================================================
  // DOCUMENT ACTIONS — optimistic update
  // ============================================================

  const uploadDocument = useCallback(async (file: File, personName: string, onSuccess: () => void) => {
    setIsUploading(true);

    // Optimistic: أضف placeholder فوري
    const tempId = Date.now();
    const tempDoc: DocumentItem = {
      id: tempId,
      category: selectedCategory!,
      batch_id: selectedBatch,
      person_name: personName,
      file_name: file.name,
      file_path: '',
      file_type: file.type,
      url: '',
    };
    setDocuments(prev => [tempDoc, ...prev]);
    onSuccess(); // أغلق الـ dialog فوراً

    const formData = new FormData();
    formData.append('file', file);
    formData.append('person_name', personName);
    formData.append('category', selectedCategory || '');
    if (selectedBatch) formData.append('batch_id', String(selectedBatch));
    if (selectedYear) formData.append('year_id', String(selectedYear));

    try {
      const response = await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newDoc = response.data.data || response.data;
      // استبدل الـ temp بالحقيقي
      setDocuments(prev => prev.map(d => d.id === tempId ? newDoc : d));
      toastRef.current({ title: 'تم', description: 'تم رفع الملف بنجاح' });
    } catch (error) {
      // rollback
      setDocuments(prev => prev.filter(d => d.id !== tempId));
      handleApiError(error, 'فشل رفع الملف');
    } finally {
      setIsUploading(false);
    }
  }, [selectedCategory, selectedBatch, selectedYear, handleApiError]);

  const editDocument = useCallback(async (
    id: number, personName: string, file: File | null, onSuccess: () => void
  ) => {
    setIsUploading(true);

    // Optimistic: حدّث الاسم فوراً
    const backup = documents;
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, person_name: personName } : d));
    onSuccess(); // أغلق الـ dialog فوراً

    const formData = new FormData();
    formData.append('person_name', personName);
    if (file) formData.append('file', file);
    formData.append('_method', 'PUT');

    try {
      const response = await api.post(`/documents/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedDoc = response.data.data || response.data;
      // حدّث بالبيانات الحقيقية (مهم لو في file جديد)
      if (updatedDoc?.id) {
        setDocuments(prev => prev.map(d => d.id === id ? updatedDoc : d));
      }
      toastRef.current({ title: 'تم', description: 'تم تحديث الوثيقة بنجاح' });
    } catch (error) {
      // rollback
      setDocuments(backup);
      handleApiError(error, 'فشل تحديث الوثيقة');
    } finally {
      setIsUploading(false);
    }
  }, [documents, handleApiError]);

  const deleteDocument = useCallback(async (id: number, onSuccess: () => void) => {
    // Optimistic: احذف فوراً (كان موجود أصلاً في الكود الأصلي)
    const backup = documents;
    setDocuments(prev => prev.filter(d => d.id !== id));
    onSuccess();

    try {
      await api.delete(`/documents/${id}`);
      toastRef.current({ title: 'تم', description: 'تم الحذف بنجاح' });
    } catch (error) {
      setDocuments(backup);
      handleApiError(error, 'فشل الحذف');
    }
  }, [documents, handleApiError]);

  // ============================================================
  // MEMOIZED OUTPUT
  // ============================================================

  const states = useMemo(() => ({
    selectedCategory, selectedYear, selectedBatch,
    years, batches, documents,
    isLoading, isUploading,
    globalSearchQuery, globalSearchResults, isSearchingGlobal,
  }), [
    selectedCategory, selectedYear, selectedBatch,
    years, batches, documents,
    isLoading, isUploading,
    globalSearchQuery, globalSearchResults, isSearchingGlobal,
  ]);

  const setters = useMemo(() => ({
    setSelectedCategory,
    setSelectedYear,
    setSelectedBatch,
    setGlobalSearchQuery,
    setDocuments,
  }), []);

  const actions = useMemo(() => ({
    fetchYears, fetchBatches, fetchDocuments,
    addYear, editYear, deleteYear,
    addBatch, editBatch, deleteBatch,
    uploadDocument, editDocument, deleteDocument,
    handleApiError,
  }), [
    fetchYears, fetchBatches, fetchDocuments,
    addYear, editYear, deleteYear,
    addBatch, editBatch, deleteBatch,
    uploadDocument, editDocument, deleteDocument,
    handleApiError,
  ]);

  return { states, setters, actions };
}