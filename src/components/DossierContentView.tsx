import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import {
  UploadCloud, File, Trash2, Loader2, Eye, Folder,
  CheckSquare, Square, X, MoreVertical, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

// مكتبة ضغط الصور الجديدة
import imageCompression from 'browser-image-compression';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

interface ApiFile {
  id: number;
  file_name: string;
  file_type: string;
  url: string;
  download_url?: string;
}

const FileItem = memo(({ file, isSelected, onToggleSelect, onItemAction, onSafeOpenFile, onDownloadDocument, onPromptDelete }: any) => {
  const isImage = file.file_type === 'image' || (file.file_name && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.file_name));

  return (
    <div className={`group relative aspect-square bg-card border rounded-xl overflow-hidden transition-all duration-200 ${isSelected ? 'ring-2 ring-primary border-primary shadow-md transform scale-95' : 'border-border/50 hover:shadow-md'}`}>
      <div className="absolute top-2 right-2 z-20">
        <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(file.id)} className="data-[state=checked]:bg-primary border-white/50 bg-black/20 w-5 h-5" tabIndex={-1} />
      </div>
      <div
        role="button" tabIndex={0}
        className="w-full h-full cursor-pointer flex items-center justify-center bg-secondary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/80"
        onClick={() => onItemAction(file)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onItemAction(file); } }}
      >
        {isImage ? (
          <img 
            src={file.url} 
            alt={file.file_name} 
            // إضافة decoding="async" لمنع تجمد الواجهة أثناء تحميل الصور (ميزة لـ React 19)
            decoding="async" 
            loading="lazy" 
            className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? '' : 'group-hover:scale-110'}`} 
          />
        ) : (
          <div className="text-center p-2">
            <File className="w-10 h-10 mx-auto text-blue-500/80 mb-2" />
            <p className="text-[10px] font-medium line-clamp-2 text-foreground/80 break-all">{file.file_name}</p>
          </div>
        )}
      </div>
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-md bg-white/80 hover:bg-white text-black"><MoreVertical className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent dir="rtl">
              <DropdownMenuItem onClick={() => onSafeOpenFile(file)}><Eye className="w-4 h-4 ml-2" /> عرض</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownloadDocument(file)}><Download className="w-4 h-4 ml-2" /> تحميل مباشر</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={(e) => { e.stopPropagation(); onPromptDelete([file.id]); }}>
                <Trash2 className="w-4 h-4 ml-2" /> حذف
              </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.isSelected === nextProps.isSelected && prevProps.file.id === nextProps.file.id);

const DossierContentView = ({ dossier, onRefresh }: { dossier: any, onRefresh?: () => void }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState({ uploaded: 0, total: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<number[]>([]);

  const dossierId = dossier?.id;

  const { data: files = [], isLoading, isError } = useQuery({
    queryKey: ['dossier_files', dossierId],
    queryFn: async ({ signal }) => {
      const response = await api.get(`/dossiers/${dossierId}/files`, { signal });
      return response.data?.data || response.data || [];
    },
    enabled: !!dossierId,
    staleTime: 1000 * 60 * 5,
    // gcTime كبير يحمي الكاش أثناء StrictMode unmount/remount — يمنع الـ double fetch
    gcTime:    1000 * 60 * 10,
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.post('/files/bulk-delete', { ids, dossier_id: dossierId }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['dossier_files', dossierId] });
      const previousFiles = queryClient.getQueryData<ApiFile[]>(['dossier_files', dossierId]);
      queryClient.setQueryData(['dossier_files', dossierId], previousFiles?.filter(f => !ids.includes(f.id)));
      return { previousFiles };
    },
    onError: (err, ids, context) => {
      queryClient.setQueryData(['dossier_files', dossierId], context?.previousFiles);
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'تم الحذف بنجاح' });
      if (onRefresh) onRefresh();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dossier_files', dossierId] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (fileList: File[]) => {
      setIsUploading(true);
      setUploadStatus({ uploaded: 0, total: fileList.length });
      setUploadProgress(0);

      const failedFiles: string[] = [];

      for (let i = 0; i < fileList.length; i++) {
        let currentFile = fileList[i];
        const originalName = fileList[i].name;

        if (currentFile.type.startsWith('image/')) {
          try {
            currentFile = await imageCompression(currentFile, {
              maxSizeMB: 2,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            });
          } catch {
            // نكمل بالحجم الأصلي لو فشل الضغط
          }
        }

        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('dossier_id', String(dossierId));

        try {
          await api.post('/files', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const filePercent = (progressEvent.loaded / progressEvent.total) * 100;
                const overallPercent = Math.round(((i * 100) + filePercent) / fileList.length);
                setUploadProgress(overallPercent);
              }
            },
          });
          setUploadStatus(prev => ({ ...prev, uploaded: i + 1 }));
        } catch {
          failedFiles.push(originalName);
        }
      }

      setIsUploading(false);
      return { total: fileList.length, failedFiles };
    },
    onSuccess: ({ total, failedFiles }) => {
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['dossier_files', dossierId] });
      if (onRefresh) onRefresh();

      const successCount = total - failedFiles.length;
      if (failedFiles.length === 0) {
        toast({ title: 'تم الرفع بنجاح', description: total > 1 ? `تم رفع ${total} ملف` : undefined });
      } else if (successCount === 0) {
        toast({ title: 'فشل الرفع', description: 'فشل رفع جميع الملفات، تحقق من الاتصال', variant: 'destructive' });
      } else {
        toast({
          title: `تم رفع ${successCount} من ${total}`,
          description: `فشل: ${failedFiles.join('، ')}`,
          variant: 'destructive',
        });
      }
    },
    onError: () => {
      setIsUploading(false);
      toast({ title: 'خطأ', description: 'حدث مشكلة أثناء الرفع', variant: 'destructive' });
    },
  });

  useEffect(() => {
    setSelectedIds(new Set());
  }, [dossierId]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === files.length ? new Set() : new Set(files.map((f: ApiFile) => f.id)));
  }, [files]);

  const promptDelete = useCallback((ids: number[]) => {
    if (ids.length === 0) return;
    setFilesToDelete(ids);
    setShowDeleteConfirm(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); toggleSelectAll(); }
      if (e.key === 'Escape' && selectedIds.size > 0) { e.preventDefault(); setSelectedIds(new Set()); }
      if (e.key === 'Delete' && selectedIds.size > 0 && !showDeleteConfirm) { e.preventDefault(); promptDelete(Array.from(selectedIds)); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, showDeleteConfirm, promptDelete, toggleSelectAll]);

  const executeDelete = () => {
    setShowDeleteConfirm(false);
    deleteMutation.mutate(filesToDelete, {
      onSettled: () => setFilesToDelete([]),
    });
    setSelectedIds(new Set());
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !dossierId) return;
    const fileList = Array.from(e.target.files);
    uploadMutation.mutate(fileList);
  };

  const handleDownloadDocument = useCallback((file: ApiFile) => {
    // direct link - المتصفح يتولى التحميل من غير ما يحمل الملف في الذاكرة
    const href = file.download_url ||
      `${(import.meta.env.VITE_API_URL as string) || (window.location.origin + '/api')}/files/${file.id}/download`;
    const a = document.createElement('a');
    a.href = href;
    a.setAttribute('download', file.file_name);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleSafeOpenFile = useCallback((file: ApiFile) => {
    // ملفات الأوفيس بس هي اللي المتصفح مبيعرفش يفتحها لوحده، فهنعملها تحميل
    const isOffice = /\.(doc|docx|xls|xlsx)$/i.test(file.file_name || '');
    if (isOffice) {
        toast({ title: 'تنبيه', description: 'جاري تحميل ملف الأوفيس...' });
        return handleDownloadDocument(file);
    }
    
    // استخدام الـ Env Variable زي الـ Standards بتاعتنا بدل الـ Hardcoding
    const apiUrl = (import.meta.env.VITE_API_URL as string) || (window.location.origin + '/api');
    
    // لو الباك إند باعت الـ URL المباشر للعرض، نستخدمه.. لو لأ، نبني الـ Endpoint
    // بنفضل دايماً نعتمد على الـ URL اللي جاي من الـ API لو متاح
    const viewUrl = file.url || `${apiUrl}/files/${file.id}/view`;
    
    // المتصفح هيتعامل مع الـ PDF والصور ويعرضهم في تاب جديدة
    // الـ noopener و noreferrer مهمين جداً للـ Security عشان الـ Tab الجديدة متقدرش تتحكم في الأصلية
    window.open(viewUrl, '_blank', 'noopener,noreferrer');
    
  }, [handleDownloadDocument, toast]);
    
  // بعده
  const handleItemAction = useCallback((file: ApiFile) => {
      setSelectedIds(prev => prev.size > 0 
          ? (prev.has(file.id) ? new Set([...prev].filter(x => x !== file.id)) : new Set([...prev, file.id])) 
          : (handleSafeOpenFile(file), prev)
      );
  }, [handleSafeOpenFile]);

  return (
    <div className="flex flex-col h-full bg-card/40 rounded-xl border border-border/50 overflow-hidden animate-in fade-in" dir="rtl">
      <div className="p-4 border-b border-border/50 flex justify-between items-center bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-4">
          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setSelectedIds(new Set())}><X className="w-4 h-4" /></Button>
              <span className="font-bold text-primary">{selectedIds.size} محدد</span>
              <Button variant="destructive" size="sm" onClick={() => promptDelete(Array.from(selectedIds))} disabled={deleteMutation.isPending} className="mr-2">
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 ml-2" />} حذف المحدد
              </Button>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Folder className="w-5 h-5 text-primary" /> {dossier?.name || 'مجلد'}</h2>
              <p className="text-muted-foreground text-xs pr-8">{files.length} ملف</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {files.length > 0 && (
            <Button variant="ghost" size="sm" onClick={toggleSelectAll} className={selectedIds.size === files.length ? "bg-primary/10 text-primary" : ""}>
              {selectedIds.size === files.length ? <CheckSquare className="w-4 h-4 ml-2" /> : <Square className="w-4 h-4 ml-2" />} تحديد الكل
            </Button>
          )}
          <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" className="hidden" ref={fileInputRef} onChange={handleBulkUpload} tabIndex={-1} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading || uploadMutation.isPending} className="h-9 px-4 font-bold shadow-lg shadow-primary/20" style={{ background: 'var(--gradient-gold)' }}>
            {uploadMutation.isPending ? <Loader2 className="animate-spin ml-2" /> : <UploadCloud className="ml-2" />}
            {uploadMutation.isPending ? `جاري (${uploadStatus.uploaded}/${uploadStatus.total})` : 'رفع ملفات'}
          </Button>
        </div>
      </div>

      {uploadMutation.isPending && (
        <div className="px-6 py-2 bg-primary/5 border-b border-primary/10">
          <div className="flex justify-between text-xs mb-1 font-medium text-primary">
            <span>جاري الرفع... الرجاء الانتظار لحين الانتهاء</span><span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-1.5" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-border/50 rounded-2xl bg-secondary/5">
            <UploadCloud className="w-20 h-20 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-bold text-muted-foreground">الدوسيه فارغ</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {files.map((file: ApiFile) => (
              <FileItem key={file.id} file={file} isSelected={selectedIds.has(file.id)} onToggleSelect={toggleSelect} onItemAction={handleItemAction} onSafeOpenFile={handleSafeOpenFile} onDownloadDocument={handleDownloadDocument} onPromptDelete={promptDelete} />
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف {filesToDelete.length} ملف نهائياً؟ لا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90" disabled={deleteMutation.isPending}>{deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد الحذف'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DossierContentView;