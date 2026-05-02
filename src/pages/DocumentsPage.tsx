import React, { useState, useCallback,useEffect ,useMemo, useRef, useReducer, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Users, UserCheck, Shield, Plus, Trash2, FileText, FileSpreadsheet,
  File as FileIcon, Upload, ChevronLeft, Loader2, Calendar, X,
  Pencil, MoreVertical, Download, Eye, Search, Home, RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import logo from '@/assets/logo.png';
import axios from 'axios';

// ============================================================
// Types
// ============================================================
type DocumentCategory = 'افراد' | 'معاونين' | 'مجندين';

interface DocumentYear  { id: number; year: number; }
interface DocumentBatch { id: number; year_id: number; batch_number: number; name: string; }
interface DocumentItem  {
  id: number; category: DocumentCategory; batch_id: number | null;
  person_name: string; file_name: string; file_type: string; url: string;
}

// ============================================================
// Constants
// ============================================================
const CATEGORIES: Array<{
  value: DocumentCategory; label: string;
  icon: React.ElementType; color: string;
}> = [
  { value: 'افراد',    label: 'أفراد',    icon: Users,     color: 'from-blue-500/20  to-blue-600/10  border-blue-500/30'  },
  { value: 'معاونين', label: 'معاونين', icon: UserCheck, color: 'from-green-500/20 to-green-600/10 border-green-500/30' },
  { value: 'مجندين',  label: 'مجندين',  icon: Shield,    color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30' },
];

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx']);

// ============================================================
// Query Keys - مركزية عشان نـ invalidate بسهولة
// ============================================================
const QK = {
  years:     ()                                              => ['years']                              as const,
  batches:   (yearId: number)                               => ['batches', yearId]                    as const,
  documents: (cat: string, yearId?: number, batchId?: number) => ['documents', cat, yearId, batchId] as const,
  search:    (q: string)                                    => ['documents', 'search', q]             as const,
};

// ============================================================
// API functions - خارج الكومبوننت
// ============================================================
const fetchYears = async (): Promise<DocumentYear[]> => {
  const res = await api.get('/years');
  return res.data.data || [];
};

const fetchBatches = async (yearId: number): Promise<DocumentBatch[]> => {
  const res = await api.get(`/years/${yearId}/batches`);
  return res.data.data || [];
};

const fetchDocuments = async (
  category: string,
  yearId?: number,
  batchId?: number,
  signal?: AbortSignal
): Promise<DocumentItem[]> => {
  const params: Record<string, unknown> = { category, limit: 100 };
  if (yearId)  params.year_id  = yearId;
  if (batchId) params.batch_id = batchId;
  const res = await api.get('/documents', { params, signal });
  return res.data.data || [];
};

const searchDocuments = async (q: string): Promise<DocumentItem[]> => {
  const res = await api.get('/documents', { params: { search: q, limit: 50 } });
  return res.data.data || [];
};

// ============================================================
// Helpers
// ============================================================
function getFileIcon(doc: DocumentItem): React.ReactNode {
  const t = doc.file_type?.toLowerCase() || '';
  const n = doc.file_name?.toLowerCase()  || '';
  if (n.endsWith('.pdf')  || t.includes('pdf'))
    return <FileIcon        className="w-10 h-10 text-red-500"          />;
  if (n.endsWith('.xls')  || n.endsWith('.xlsx') || t.includes('sheet') || t.includes('excel'))
    return <FileSpreadsheet className="w-10 h-10 text-green-500"        />;
  if (n.endsWith('.doc')  || n.endsWith('.docx') || t.includes('word')  || t.includes('document'))
    return <FileText        className="w-10 h-10 text-blue-500"         />;
  return   <FileIcon        className="w-10 h-10 text-muted-foreground" />;
}

// ============================================================
// Reducer - للـ navigation state بس
// ============================================================
interface NavState {
  selectedCategory: DocumentCategory | null;
  selectedYear:     number | null;
  selectedBatch:    number | null;
}
type NavAction =
  | { type: 'SET_CATEGORY'; payload: DocumentCategory | null }
  | { type: 'SET_YEAR';     payload: number | null }
  | { type: 'SET_BATCH';    payload: number | null };

const navReducer = (state: NavState, action: NavAction): NavState => {
  switch (action.type) {
    case 'SET_CATEGORY': return { ...state, selectedCategory: action.payload };
    case 'SET_YEAR':     return { ...state, selectedYear:     action.payload };
    case 'SET_BATCH':    return { ...state, selectedBatch:    action.payload };
    default:             return state;
  }
};

// ============================================================
// DocumentCard - memo
// ============================================================
const DocumentCard = memo(({
  doc, icon, onOpen, onDownload, onEdit, onDelete,
}: {
  doc: DocumentItem; icon: React.ReactNode;
  onOpen:     (d: DocumentItem) => void;
  onDownload: (d: DocumentItem) => void;
  onEdit:     (d: DocumentItem) => void;
  onDelete:   (d: DocumentItem) => void;
}) => (
  <div className="group relative p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 text-center transition-all">
    <div className="absolute top-2 left-2 z-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 bg-background/80">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onOpen(doc)}>
            <Eye      className="w-4 h-4 ml-2" /> عرض
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownload(doc)}>
            <Download className="w-4 h-4 ml-2" /> تحميل
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(doc)}>
            <Pencil   className="w-4 h-4 ml-2" /> تعديل
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(doc)} className="text-destructive">
            <Trash2   className="w-4 h-4 ml-2" /> حذف
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <div onClick={() => onOpen(doc)} className="cursor-pointer">
      <div className="w-20 h-20 rounded-xl bg-secondary/50 flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <p className="font-bold text-sm line-clamp-2 text-right">{doc.person_name}</p>
    </div>
  </div>
));
DocumentCard.displayName = 'DocumentCard';

// ============================================================
// Main Page
// ============================================================
const DocumentsPage: React.FC = () => {
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const qc         = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Navigation State ───────────────────────────────────────
  const [nav, dispatchNav] = useReducer(navReducer, {
    selectedCategory: searchParams.get('category') as DocumentCategory | null,
    selectedYear:     searchParams.get('year')  ? parseInt(searchParams.get('year')!)  : null,
    selectedBatch:    searchParams.get('batch') ? parseInt(searchParams.get('batch')!) : null,
  });
  const { selectedCategory, selectedYear, selectedBatch } = nav;

  // ── URL Sync ───────────────────────────────────────────────
  const setNav = useCallback((action: NavAction) => {
    dispatchNav(action);
  }, []);

  // مزامنة الـ URL دايماً من nav state الفعلي بعد التحديث
  React.useEffect(() => {
    const p = new URLSearchParams();
    if (nav.selectedCategory) p.set('category', nav.selectedCategory);
    if (nav.selectedYear)     p.set('year',     nav.selectedYear.toString());
    if (nav.selectedBatch)    p.set('batch',    nav.selectedBatch.toString());
    setSearchParams(p, { replace: true });
  }, [nav, setSearchParams]);

  // ── Local UI State ─────────────────────────────────────────
  const [searchQuery,       setSearchQuery]       = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [debouncedSearch,   setDebouncedSearch]   = useState('');
  const [showGlobalResults, setShowGlobalResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [showAddYear,  setShowAddYear]  = useState(false);
  const [newYear,      setNewYear]      = useState(new Date().getFullYear().toString());
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');

  const [showEditYearDialog,   setShowEditYearDialog]   = useState(false);
  const [showDeleteYearDialog, setShowDeleteYearDialog] = useState(false);
  const [selectedYearForEdit,  setSelectedYearForEdit]  = useState<DocumentYear | null>(null);
  const [editYearValue,        setEditYearValue]        = useState('');

  const [showEditBatchDialog,   setShowEditBatchDialog]   = useState(false);
  const [showDeleteBatchDialog, setShowDeleteBatchDialog] = useState(false);
  const [selectedBatchForEdit,  setSelectedBatchForEdit]  = useState<DocumentBatch | null>(null);
  const [editBatchName,         setEditBatchName]         = useState('');

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog,   setShowEditDialog]   = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);

  const [personName,     setPersonName]     = useState('');
  const [selectedFile,   setSelectedFile]   = useState<File | null>(null);
  const [editPersonName, setEditPersonName] = useState('');
  const [editFile,       setEditFile]       = useState<File | null>(null);

  // ============================================================
  // React Query - Data Fetching
  // ============================================================

  // السنوات - staleTime ساعة (مش هتتغير كتير)
  const { data: years = [] } = useQuery({
    queryKey: QK.years(),
    queryFn:  fetchYears,
    staleTime: 1000 * 60 * 60,
  });

  // الدفعات - staleTime 30 دقيقة
  const { data: batches = [] } = useQuery({
    queryKey: QK.batches(selectedYear!),
    queryFn:  () => fetchBatches(selectedYear!),
    enabled:  !!selectedYear,
    staleTime: 1000 * 60 * 30,
  });

  // الوثائق - staleTime 5 دقايق
  const docsEnabled = !!selectedCategory &&
    (selectedCategory !== 'مجندين' || !!selectedBatch);

  const {
    data: documents = [],
    isLoading: isLoadingDocs,
    isFetching: isFetchingDocs,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: QK.documents(selectedCategory ?? '', selectedYear ?? undefined, selectedBatch ?? undefined),
    queryFn:  ({ signal }) => fetchDocuments(selectedCategory!, selectedYear ?? undefined, selectedBatch ?? undefined, signal),
    enabled:  docsEnabled,
    staleTime: 1000 * 60 * 5,
  });

  // Global Search - debounce 600ms عبر debouncedSearch
  const { data: globalSearchResults = [], isFetching: isSearchingGlobal } = useQuery({
    queryKey: QK.search(debouncedSearch),
    queryFn:  () => searchDocuments(debouncedSearch),
    enabled:  debouncedSearch.trim().length > 1,
    staleTime: 1000 * 30,
  });

  // ============================================================
  // Mutations
  // ============================================================

  // --- Years ---
  const addYearMutation = useMutation({
    mutationFn: (year: number) => api.post('/years', { year }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.years() });
      toast({ title: 'تم', description: 'تمت إضافة السنة بنجاح' });
      setShowAddYear(false);
      setNewYear(new Date().getFullYear().toString());
    },
    onError: (err) => {
      let msg = 'فشل إضافة السنة';
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 422) msg = err.response.data?.message || 'السنة موجودة مسبقاً';
        if (err.response?.status === 401) msg = 'يرجى تسجيل الدخول';
      }
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    },
  });

  const editYearMutation = useMutation({
    mutationFn: ({ id, year }: { id: number; year: number }) => api.put(`/years/${id}`, { year }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.years() });
      toast({ title: 'تم', description: 'تم تعديل السنة' });
      setShowEditYearDialog(false);
    },
    onError: () => toast({ title: 'خطأ', description: 'فشل تعديل السنة', variant: 'destructive' }),
  });

  const deleteYearMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/years/${id}`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK.years() });
      toast({ title: 'تم', description: 'تم حذف السنة' });
      setShowDeleteYearDialog(false);
      if (selectedYear === id) {
        setNav({ type: 'SET_YEAR',  payload: null });
        setNav({ type: 'SET_BATCH', payload: null });
      }
    },
    onError: () => toast({ title: 'خطأ', description: 'فشل حذف السنة', variant: 'destructive' }),
  });

  // --- Batches ---
  const addBatchMutation = useMutation({
    mutationFn: ({ yearId, name }: { yearId: number; name: string }) =>
      api.post('/batches', { year_id: yearId, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.batches(selectedYear!) });
      toast({ title: 'تم', description: 'تمت إضافة الدفعة' });
      setShowAddBatch(false);
      setNewBatchName('');
    },
    onError: () => toast({ title: 'خطأ', description: 'فشل إضافة الدفعة', variant: 'destructive' }),
  });

  const editBatchMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.put(`/batches/${id}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.batches(selectedYear!) });
      toast({ title: 'تم', description: 'تم تعديل الدفعة' });
      setShowEditBatchDialog(false);
    },
    onError: () => toast({ title: 'خطأ', description: 'فشل تعديل الدفعة', variant: 'destructive' }),
  });

  const deleteBatchMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/batches/${id}`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK.batches(selectedYear!) });
      toast({ title: 'تم', description: 'تم حذف الدفعة' });
      setShowDeleteBatchDialog(false);
      if (selectedBatch === id) setNav({ type: 'SET_BATCH', payload: null });
    },
    onError: () => toast({ title: 'خطأ', description: 'فشل حذف الدفعة', variant: 'destructive' }),
  });

  // --- Documents ---
  const docsQueryKey = QK.documents(selectedCategory ?? '', selectedYear ?? undefined, selectedBatch ?? undefined);

  const uploadDocMutation = useMutation({
    mutationFn: (fd: FormData) => api.post('/documents', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: (res) => {
      // Optimistic: نضيف الوثيقة الجديدة للكاش فوراً بدون re-fetch
      qc.setQueryData<DocumentItem[]>(docsQueryKey, (old = []) =>
        [...old, res.data.data].sort((a, b) => a.person_name.localeCompare(b.person_name, 'ar'))
      );
      toast({ title: 'تم', description: 'تم رفع الملف بنجاح' });
      setShowUploadDialog(false);
      setPersonName('');
      setSelectedFile(null);
    },
    onError: (err) => {
      let msg = 'فشل رفع الملف';
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) msg = 'يرجى تسجيل الدخول';
        if (err.response?.status === 422) msg = 'نوع الملف أو حجمه غير مسموح';
      }
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    },
  });

  const editDocMutation = useMutation({
    mutationFn: ({ id, fd }: { id: number; fd: FormData }) =>
      api.post(`/documents/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: (_, { id }) => {
      // Optimistic: نحدث الاسم في الكاش فوراً
      qc.setQueryData<DocumentItem[]>(docsQueryKey, (old = []) =>
        old.map(d => d.id === id ? { ...d, person_name: editPersonName.trim() } : d)
      );
      toast({ title: 'تم', description: 'تم تحديث الوثيقة' });
      setShowEditDialog(false);
    },
    onError: () => toast({ title: 'خطأ', description: 'فشل تحديث الوثيقة', variant: 'destructive' }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/documents/${id}`),
    // Optimistic delete: نشيله من الكاش فوراً
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: docsQueryKey });
      const prev = qc.getQueryData<DocumentItem[]>(docsQueryKey);
      qc.setQueryData<DocumentItem[]>(docsQueryKey, (old = []) => old.filter(d => d.id !== id));
      return { prev };
    },
    onSuccess: () => {
      toast({ title: 'تم', description: 'تم الحذف بنجاح' });
      setShowDeleteDialog(false);
    },
    onError: (_, __, ctx) => {
      // لو فشل نرجع البيانات القديمة
      if (ctx?.prev) qc.setQueryData(docsQueryKey, ctx.prev);
      toast({ title: 'خطأ', description: 'فشل الحذف، تم استعادة الملف', variant: 'destructive' });
    },
  });

  // ============================================================
  // Handlers
  // ============================================================
  const handleAddYear = () => {
    const y = parseInt(newYear);
    if (isNaN(y) || y < 2000 || y > 2100) {
      toast({ title: 'خطأ', description: 'أدخل سنة بين 2000 و 2100', variant: 'destructive' });
      return;
    }
    addYearMutation.mutate(y);
  };

  const handleEditYear = () => {
    if (!selectedYearForEdit) return;
    const y = parseInt(editYearValue);
    if (isNaN(y) || y < 2000 || y > 2100) {
      toast({ title: 'خطأ', description: 'أدخل سنة صحيحة', variant: 'destructive' });
      return;
    }
    editYearMutation.mutate({ id: selectedYearForEdit.id, year: y });
  };

  const handleDeleteYear = () => {
    if (selectedYearForEdit) deleteYearMutation.mutate(selectedYearForEdit.id);
  };

  const handleAddBatch = () => {
    if (!newBatchName.trim()) {
      toast({ title: 'خطأ', description: 'أدخل اسم الدفعة', variant: 'destructive' });
      return;
    }
    addBatchMutation.mutate({ yearId: selectedYear!, name: newBatchName.trim() });
  };

  const handleEditBatch = () => {
    if (!selectedBatchForEdit || !editBatchName.trim()) return;
    editBatchMutation.mutate({ id: selectedBatchForEdit.id, name: editBatchName.trim() });
  };

  const handleDeleteBatch = () => {
    if (selectedBatchForEdit) deleteBatchMutation.mutate(selectedBatchForEdit.id);
  };

  const handleUploadDocument = () => {
    if (!selectedFile || !personName.trim()) {
      toast({ title: 'تنبيه', description: 'أدخل الاسم واختر ملفاً', variant: 'destructive' });
      return;
    }
    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('person_name', personName.trim());
    fd.append('category', selectedCategory || '');
    if (selectedBatch) fd.append('batch_id', String(selectedBatch));
    if (selectedYear)  fd.append('year_id',  String(selectedYear));
    uploadDocMutation.mutate(fd);
  };

  const handleEditDocument = () => {
    if (!selectedDocument || !editPersonName.trim()) return;
    const fd = new FormData();
    fd.append('person_name', editPersonName.trim());
    if (editFile) fd.append('file', editFile);
    fd.append('_method', 'PUT');
    editDocMutation.mutate({ id: selectedDocument.id, fd });
  };

  const handleDeleteDocument = () => {
    if (selectedDocument) deleteDocMutation.mutate(selectedDocument.id);
  };

  // ── File Helpers ──────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'خطأ', description: 'الحجم لا يتجاوز 50MB', variant: 'destructive' });
      return;
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      toast({ title: 'خطأ', description: 'نوع الملف غير مدعوم', variant: 'destructive' });
      return;
    }
    if (isEdit) setEditFile(file);
    else setSelectedFile(file);
  };

  // بناء الـ URL المباشر للملف (الـ view/download routes عامة بدون auth)
  const getPublicFileUrl = useCallback((type: 'view' | 'download', id: number) => {
    const base = (import.meta.env.VITE_API_URL as string) || (window.location.origin + '/api');
    return `${base}/documents/${id}/${type}`;
  }, []);

  const handleDownloadDocument = useCallback((doc: DocumentItem) => {
    // تحميل مباشر عبر link - OS يفتح الملف تلقائياً بالبرنامج المناسب
    const a = document.createElement('a');
    a.href = getPublicFileUrl('download', doc.id);
    a.setAttribute('download', doc.file_name);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [getPublicFileUrl]);

  const openFile = useCallback((doc: DocumentItem) => {
    const n = doc.file_name?.toLowerCase() || '';
    const t = doc.file_type?.toLowerCase() || '';

    const isOffice = n.endsWith('.doc')  || n.endsWith('.docx') ||
                     n.endsWith('.xls')  || n.endsWith('.xlsx') ||
                     t.includes('word')  || t.includes('excel') || t.includes('sheet');

    if (isOffice) {
      handleDownloadDocument(doc);
      return;
    }

    // PDF: فتح في تبويب جديد عبر <a> tag
    // أموثق من window.open ومش بيتحجب من popup blockers
    const a = document.createElement('a');
    a.href   = getPublicFileUrl('view', doc.id);
    a.target = '_blank';
    a.rel    = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [handleDownloadDocument, getPublicFileUrl]);

  // Dialog openers
  const openEditDialog = useCallback((doc: DocumentItem) => {
    setSelectedDocument(doc); setEditPersonName(doc.person_name);
    setEditFile(null); setShowEditDialog(true);
  }, []);
  const openDeleteDialog    = useCallback((doc: DocumentItem)   => { setSelectedDocument(doc);  setShowDeleteDialog(true);    }, []);
  const openEditYearDialog  = useCallback((y: DocumentYear, e: React.MouseEvent) => { e.stopPropagation(); setSelectedYearForEdit(y);  setEditYearValue(y.year.toString()); setShowEditYearDialog(true);  }, []);
  const openDeleteYearDialog= useCallback((y: DocumentYear, e: React.MouseEvent) => { e.stopPropagation(); setSelectedYearForEdit(y);  setShowDeleteYearDialog(true);  }, []);
  const openEditBatchDialog = useCallback((b: DocumentBatch, e: React.MouseEvent) => { e.stopPropagation(); setSelectedBatchForEdit(b); setEditBatchName(b.name);           setShowEditBatchDialog(true); }, []);
  const openDeleteBatchDialog=useCallback((b: DocumentBatch, e: React.MouseEvent) => { e.stopPropagation(); setSelectedBatchForEdit(b); setShowDeleteBatchDialog(true); }, []);

  const handleBack = useCallback(() => {
    if (selectedBatch)     setNav({ type: 'SET_BATCH',    payload: null });
    else if (selectedYear) setNav({ type: 'SET_YEAR',     payload: null });
    else                   setNav({ type: 'SET_CATEGORY', payload: null });
  }, [selectedBatch, selectedYear]);

  // ── Derived ────────────────────────────────────────────────
  const getCurrentTitle = useMemo(() => {
    if (selectedCategory === 'مجندين' && selectedBatch) {
      const batch = batches.find(b => b.id === selectedBatch);
      const year  = years.find(y  => y.id === selectedYear);
      return `${batch?.name} - ${year?.year}`;
    }
    if (selectedCategory === 'مجندين' && selectedYear)
      return `مجندين - ${years.find(y => y.id === selectedYear)?.year}`;
    return CATEGORIES.find(c => c.value === selectedCategory)?.label || 'وثائق التعارف';
  }, [selectedCategory, selectedBatch, selectedYear, batches, years]);

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter(d => d.person_name.toLowerCase().includes(q));
  }, [documents, searchQuery]);

  const documentIcons = useMemo(
    () => Object.fromEntries(filteredDocuments.map(d => [d.id, getFileIcon(d)])),
    [filteredDocuments]
  );

  // Loading / uploading shortcuts
  const isUploading = addYearMutation.isPending || editYearMutation.isPending ||
    deleteYearMutation.isPending || addBatchMutation.isPending || editBatchMutation.isPending ||
    deleteBatchMutation.isPending || uploadDocMutation.isPending || editDocMutation.isPending ||
    deleteDocMutation.isPending;

  // ── Global search debounce ────────────────────────────────
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(globalSearchQuery), 600);
    return () => clearTimeout(t);
  }, [globalSearchQuery]);

  // click outside
  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node))
        setShowGlobalResults(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

 // ── Virtual Grid للوثائق - بيرند بس اللي في الشاشة ──────
const CARD_H = 160;
const virtualParentRef = useRef<HTMLDivElement>(null);

const getCols = () => {
  const w = window.innerWidth;
  if (w >= 1024) return 6;
  if (w >= 768)  return 4;
  if (w >= 640)  return 3;
  return 2;
};

const [cols, setCols] = useState(getCols);

useEffect(() => {
  const handler = () => setCols(getCols());
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);

const docRows = useMemo(() => {
  const rows: DocumentItem[][] = [];
  for (let i = 0; i < filteredDocuments.length; i += cols) {
    rows.push(filteredDocuments.slice(i, i + cols));
  }
  return rows;
}, [filteredDocuments, cols]);

const rowVirtualizer = useVirtualizer({
  count: docRows.length,
  getScrollElement: () => virtualParentRef.current,
  estimateSize: () => CARD_H + 16,
  overscan: 3,
});

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background" dir="rtl">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <Home className="w-5 h-5" />
              </Button>
              {selectedCategory && (
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
              <h1 className="text-lg lg:text-xl font-bold text-foreground">{getCurrentTitle}</h1>
            </div>
            {/* مؤشر بسيط إن في بيانات بتتحدث في الخلفية */}
            {isFetchingDocs && !isLoadingDocs && (
              <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {selectedCategory && (selectedCategory !== 'مجندين' || selectedBatch) && (
              <Button onClick={() => setShowUploadDialog(true)} disabled={isUploading}>
                <Plus className="w-4 h-4 ml-2" /> إضافة وثيقة
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">

        {/* Global Search */}
        {!selectedCategory && (
          <div className="max-w-2xl mx-auto mb-12 relative" ref={searchContainerRef}>
            <div className="relative flex items-center group">
              <Search className="absolute right-4 w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                className="h-14 pr-12 text-lg rounded-2xl shadow-sm border-2 focus-visible:ring-0 focus-visible:border-primary transition-all bg-card/50 backdrop-blur-sm"
                placeholder="بحث عام بالاسم في جميع الوثائق..."
                value={globalSearchQuery}
                onChange={e => { setGlobalSearchQuery(e.target.value); setShowGlobalResults(true); }}
                onFocus={() => { if (globalSearchQuery.trim()) setShowGlobalResults(true); }}
              />
              {isSearchingGlobal && (
                <div className="absolute left-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
            </div>
            {showGlobalResults && globalSearchQuery.trim() && (
              <div className="absolute top-full mt-2 w-full bg-card border border-border/50 rounded-2xl shadow-xl z-50 max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                {globalSearchResults.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {globalSearchResults.map(doc => (
                      <div key={doc.id} onClick={() => openFile(doc)}
                        className="flex items-center justify-between p-3 hover:bg-secondary/80 rounded-xl cursor-pointer transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-background rounded-lg group-hover:scale-110 transition-transform">
                            {getFileIcon(doc)}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{doc.person_name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{doc.file_name}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-sm font-normal bg-background">
                          ( {doc.category} )
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : !isSearchingGlobal ? (
                  <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                    <Search className="w-10 h-10 mb-3 opacity-20" />
                    <p>لا توجد نتائج لـ "{globalSearchQuery}"</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Category Selection */}
        {!selectedCategory && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {CATEGORIES.map(({ value, label, icon: Icon, color }) => (
              <button key={value}
                onClick={() => setNav({ type: 'SET_CATEGORY', payload: value })}
                className={`p-8 rounded-2xl border bg-gradient-to-br ${color} hover:scale-105 transition-all duration-300 text-center group`}>
                <div className="w-20 h-20 rounded-xl bg-background/50 flex items-center justify-center mx-auto mb-4 group-hover:bg-background/80 transition-colors">
                  <Icon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{label}</h3>
                {value === 'مجندين' && <p className="text-sm text-muted-foreground mt-2">دفعات سنوية</p>}
              </button>
            ))}
          </div>
        )}

        {/* Year Selection */}
        {selectedCategory === 'مجندين' && !selectedYear && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">اختر السنة</h3>
              <Button onClick={() => setShowAddYear(true)} disabled={isUploading}>
                <Plus className="w-4 h-4 ml-2" /> إضافة سنة
              </Button>
            </div>
            {showAddYear && (
              <div className="flex gap-2 p-4 bg-secondary/30 rounded-lg items-center">
                <Input type="number" value={newYear} min="2000" max="2100" className="w-36"
                  placeholder="مثال: 2025" disabled={isUploading}
                  onChange={e => setNewYear(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddYear()} />
                <Button onClick={handleAddYear} disabled={addYearMutation.isPending}>
                  {addYearMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إضافة'}
                </Button>
                <Button variant="ghost" disabled={isUploading}
                  onClick={() => { setShowAddYear(false); setNewYear(new Date().getFullYear().toString()); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            {years.length === 0 && !showAddYear && (
              <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-2xl">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد سنوات - أضف سنة جديدة</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {years.map(year => (
                <div key={year.id}
                  className="group relative p-6 rounded-xl border border-border bg-card hover:bg-primary/10 cursor-pointer text-center transition-all"
                  onClick={() => setNav({ type: 'SET_YEAR', payload: year.id })}>
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={e => openEditYearDialog(year, e)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={e => openDeleteYearDialog(year, e)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Calendar className="w-8 h-8 text-primary mx-auto mb-3" />
                  <span className="text-2xl font-bold">{year.year}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Batch Selection */}
        {selectedCategory === 'مجندين' && selectedYear && !selectedBatch && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">
                اختر الدفعة - {years.find(y => y.id === selectedYear)?.year}
              </h3>
              <Button onClick={() => setShowAddBatch(true)} disabled={isUploading}>
                <Plus className="w-4 h-4 ml-2" /> إضافة دفعة
              </Button>
            </div>
            {showAddBatch && (
              <div className="flex gap-2 p-4 bg-secondary/30 rounded-lg items-center">
                <Input value={newBatchName} className="flex-1" placeholder="اسم الدفعة"
                  disabled={isUploading} onChange={e => setNewBatchName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddBatch()} />
                <Button onClick={handleAddBatch} disabled={addBatchMutation.isPending}>
                  {addBatchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إضافة'}
                </Button>
                <Button variant="ghost" disabled={isUploading}
                  onClick={() => { setShowAddBatch(false); setNewBatchName(''); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            {batches.length === 0 && !showAddBatch && (
              <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-2xl">
                <p>لا توجد دفعات - أضف دفعة جديدة</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {batches.map(batch => (
                <div key={batch.id}
                  className="group relative p-6 rounded-xl border border-border bg-card hover:bg-primary/10 cursor-pointer text-right transition-all"
                  onClick={() => setNav({ type: 'SET_BATCH', payload: batch.id })}>
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={e => openEditBatchDialog(batch, e)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={e => openDeleteBatchDialog(batch, e)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Badge variant="secondary" className="mb-2">دفعة {batch.batch_number}</Badge>
                  <h4 className="text-lg font-bold">{batch.name}</h4>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents Grid */}
        {docsEnabled && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="بحث في هذه القائمة..." className="pr-10" />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {filteredDocuments.length} وثيقة
                </Badge>
                <Button variant="outline" size="icon"
                  onClick={() => refetchDocuments()} disabled={isLoadingDocs}>
                  <RefreshCw className={`w-4 h-4 ${isFetchingDocs ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {isLoadingDocs ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin w-10 h-10" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-20 bg-card/30 rounded-2xl">
                <p className="text-muted-foreground">لا توجد وثائق هنا</p>
                {!searchQuery && (
                  <Button variant="outline" className="mt-4"
                    onClick={() => setShowUploadDialog(true)}>
                    <Plus className="w-4 h-4 ml-2" /> إضافة وثيقة
                  </Button>
                )}
              </div>
            ) : (
              // Virtual Grid - بيرند بس الصفوف اللي في الشاشة مهما كان العدد
              <ScrollArea 
                viewportRef={virtualParentRef} 
                className="h-[70vh] pr-4 -mr-4" 
                dir="rtl"
              >
                <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map(virtualRow => (
                    <div
                      key={virtualRow.index}
                      style={{
                        position: 'absolute',
                        top: virtualRow.start,
                        left: 0,
                        right: 0,
                        height: virtualRow.size,
                      }}
                      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-4"
                    >
                      {docRows[virtualRow.index].map(doc => (
                        <DocumentCard key={doc.id} doc={doc} icon={documentIcons[doc.id]}
                          onOpen={openFile} onDownload={handleDownloadDocument}
                          onEdit={openEditDialog} onDelete={openDeleteDialog} />
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </main>

      {/* ── Dialogs ─────────────────────────────────────── */}
      <Dialog open={showUploadDialog}
        onOpenChange={o => { if (!o) { setPersonName(''); setSelectedFile(null); } setShowUploadDialog(o); }}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة وثيقة</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>اسم الشخص</Label>
              <Input value={personName} placeholder="أدخل الاسم"
                onChange={e => setPersonName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUploadDocument()} />
            </div>
            <div>
              <Label>الملف</Label>
              <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={e => handleFileSelect(e)} />
              {selectedFile && <p className="text-xs text-muted-foreground mt-1">{selectedFile.name}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUploadDocument} disabled={uploadDocMutation.isPending}>
              {uploadDocMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin ml-2" />
                : <Upload   className="w-4 h-4 ml-2" />}
              رفع الملف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog}
        onOpenChange={o => { if (!o) setEditFile(null); setShowEditDialog(o); }}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعديل الوثيقة</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>اسم الشخص</Label>
              <Input value={editPersonName} onChange={e => setEditPersonName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEditDocument()} />
            </div>
            <div>
              <Label>تغيير الملف (اختياري)</Label>
              <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={e => handleFileSelect(e, true)} />
              {editFile && <p className="text-xs text-muted-foreground mt-1">{editFile.name}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditDocument} disabled={editDocMutation.isPending}>
              {editDocMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditYearDialog} onOpenChange={setShowEditYearDialog}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعديل السنة</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input type="number" value={editYearValue} min="2000" max="2100"
              onChange={e => setEditYearValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEditYear()} />
          </div>
          <DialogFooter>
            <Button onClick={handleEditYear} disabled={editYearMutation.isPending}>
              {editYearMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />} حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditBatchDialog} onOpenChange={setShowEditBatchDialog}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعديل الدفعة</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input value={editBatchName} onChange={e => setEditBatchName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEditBatch()} />
          </div>
          <DialogFooter>
            <Button onClick={handleEditBatch} disabled={editBatchMutation.isPending}>
              {editBatchMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />} حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا الملف؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteYearDialog} onOpenChange={setShowDeleteYearDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف السنة</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف جميع الدفعات والملفات المرتبطة!</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteYear} className="bg-destructive"
              disabled={deleteYearMutation.isPending}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteBatchDialog} onOpenChange={setShowDeleteBatchDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الدفعة</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف جميع الملفات المرتبطة!</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBatch} className="bg-destructive"
              disabled={deleteBatchMutation.isPending}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default DocumentsPage;