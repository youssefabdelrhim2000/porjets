import React, { useState, useTransition } from 'react'; // تم حذف useMemo, useCallback, memo بفضل React Compiler
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'; // إضافة useMutation
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FolderOpen, Folder, ArrowRight, Search, Loader2, Star,
  Briefcase, Archive, Image as ImageIcon, Shield,
  MoreVertical, Pencil, Trash2, Plus, AlertTriangle
} from 'lucide-react';
import api from '@/lib/axios';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import DossierContentView from '../components/DossierContentView';

// --- Types & Constants ---
export interface Dossier {
  id: number;
  name: string;
  icon: string;
  description?: string;
  created_at: string;
}

const DOSSIER_ICONS = [
  { id: 'folder', icon: Folder, color: 'text-blue-500' },
  { id: 'star', icon: Star, color: 'text-yellow-500' },
  { id: 'briefcase', icon: Briefcase, color: 'text-brown-500' },
  { id: 'shield', icon: Shield, color: 'text-green-500' },
  { id: 'archive', icon: Archive, color: 'text-gray-500' },
  { id: 'image', icon: ImageIcon, color: 'text-purple-500' },
];

// --- Sub-Components ---
// في React 19 لم نعد بحاجة لتغليف المكون بـ memo
const DossierCard = ({
  dossier, hasEditPerm, onClick, onEdit, onDelete
}: {
  dossier: Dossier;
  hasEditPerm: boolean;
  onClick: (d: Dossier) => void;
  onEdit: (d: Dossier) => void;
  onDelete: (d: Dossier) => void;
}) => {
  const iconItem = DOSSIER_ICONS.find(i => i.id === dossier.icon) || DOSSIER_ICONS[0];
  const Icon = iconItem.icon;
  return (
    <div
      className="group relative p-6 bg-card border border-border/50 hover:border-primary/50 hover:shadow-lg rounded-xl cursor-pointer transition-all flex flex-col items-center gap-3"
      onClick={() => onClick(dossier)}
    >
      <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
        <Icon className={cn("w-8 h-8", iconItem.color)} />
      </div>
      <h3 className="font-bold truncate w-full text-center">{dossier.name}</h3>
      <p className="text-xs text-muted-foreground">{new Date(dossier.created_at).toLocaleDateString('ar-EG')}</p>
      {hasEditPerm && (
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 hover:bg-secondary rounded-full focus-visible:ring-2"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" dir="rtl">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(dossier); }}>
                <Pencil className="w-4 h-4 ml-2" /> تعديل
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); onDelete(dossier); }}
              >
                <Trash2 className="w-4 h-4 ml-2" /> حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

// --- Main Component ---
interface DossiersManagerProps {
  hasPermission: (permission: string) => boolean;
  onBack: () => void;
}

const DossiersManager: React.FC<DossiersManagerProps> = ({ hasPermission, onBack }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // تحسين البحث باستخدام Transition في React 19 لمنع ثقل الواجهة
  const [searchQuery, setSearchQuery] = useState('');
  const [deferredSearch, setDeferredSearch] = useState('');
  const [isPendingTransition, startTransition] = useTransition();
  
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);

  // Dialogs States
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDossierName, setNewDossierName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  
  const [dossierToEdit, setDossierToEdit] = useState<Dossier | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('folder');
  
  const [dossierToDelete, setDossierToDelete] = useState<Dossier | null>(null);

  // Fetching (أضفنا staleTime ليصبح الجلب لحظي عند العودة من دوسيه)
  const { data: dossiers = [], isLoading } = useQuery({
    queryKey: ['dossiers'],
    queryFn: async ({ signal }) => {
      const response = await api.get('/dossiers', { signal });
      const data = response.data.data || response.data;
      return Array.isArray(data) ? data : [];
    },
    staleTime: 1000 * 60 * 5,
    gcTime:    1000 * 60 * 10,
  });

  // Filtering (الكومبايلر يدير الـ Memoization هنا تلقائياً)
  const filteredDossiers = deferredSearch.trim() 
    ? dossiers.filter((d: Dossier) => d.name.toLowerCase().includes(deferredSearch.toLowerCase()))
    : dossiers;

  // هاندلر البحث السريع (React 19)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    startTransition(() => {
      setDeferredSearch(e.target.value);
    });
  };

  // --- Mutations (توحيد اللوجيك ليكون أسرع وأكثر استقراراً) ---
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/dossiers', data),
    onSuccess: () => {
      toast({ title: 'تم', description: 'تم إنشاء الدوسيه بنجاح' });
      setShowCreateDialog(false); 
      setNewDossierName(''); 
      setSelectedIcon('folder');
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
    },
    onError: () => toast({ title: 'خطأ', description: 'فشل إنشاء الدوسيه', variant: 'destructive' })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => api.put(`/dossiers/${id}`, data),
    onSuccess: () => {
      toast({ title: 'تم', description: 'تم تحديث الدوسيه بنجاح' });
      setDossierToEdit(null);
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
    },
    onError: () => toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/dossiers/${id}`),
    onSuccess: () => {
      toast({ title: 'تم الحذف', description: 'تم حذف الدوسيه بنجاح' });
      if (selectedDossier?.id === dossierToDelete?.id) setSelectedDossier(null);
      setDossierToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
    },
    onError: () => toast({ title: 'خطأ', description: 'فشل عملية الحذف', variant: 'destructive' })
  });

  // --- Handlers ---
  const handleDossierClick = (d: Dossier) => setSelectedDossier(d);
  const handleEditClick = (d: Dossier) => { setDossierToEdit(d); setEditName(d.name); setEditIcon(d.icon); };
  const handleDeleteClick = (d: Dossier) => setDossierToDelete(d);

  const handleCreate = () => {
    if (!newDossierName.trim()) return;
    createMutation.mutate({ name: newDossierName, icon: selectedIcon, description: 'تم الإنشاء بواسطة النظام', color: 'blue' });
  };

  const handleUpdate = () => {
    if (!dossierToEdit || !editName.trim()) return;
    updateMutation.mutate({ id: dossierToEdit.id, data: { name: editName, icon: editIcon, color: 'blue' } });
  };

  const handleDelete = () => {
    if (!dossierToDelete) return;
    deleteMutation.mutate(dossierToDelete.id);
  };

  // --- Render ---
  if (selectedDossier) {
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
        <Button variant="ghost" onClick={() => setSelectedDossier(null)} className="w-fit mb-4 gap-2 hover:bg-secondary/50">
          <ArrowRight className="w-4 h-4" /> رجوع لقائمة الدوسيهات
        </Button>
        <DossierContentView
          dossier={selectedDossier}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['dossiers'] })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center bg-card/50 p-4 rounded-xl border border-border/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowRight className="w-4 h-4 ml-2" /> الرجوع للرئيسية
          </Button>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FolderOpen className="text-primary" /> الأرشيف الإلكتروني
          </h2>
        </div>
        {hasPermission('add_dossiers') && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 ml-2" /> دوسيه جديد
          </Button>
        )}
      </div>
      
      <div className="relative max-w-md mx-auto">
        {isPendingTransition ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
        ) : (
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <Input
          placeholder="بحث في الدوسيهات..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="pr-9 bg-card"
        />
      </div>

      {isLoading && dossiers.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin w-8 h-8 text-primary" />
        </div>
      ) : filteredDossiers.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-xl bg-card/30">
          <Folder className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">لا توجد دوسيهات مطابقة للبحث</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredDossiers.map((dossier: Dossier) => (
            <DossierCard
              key={dossier.id}
              dossier={dossier}
              hasEditPerm={hasPermission('edit_dossiers')}
              onClick={handleDossierClick}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إنشاء دوسيه جديد</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم الدوسيه</Label>
              <Input value={newDossierName} onChange={e => setNewDossierName(e.target.value)} placeholder="مثال: صور الموقع" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
            </div>
            <div className="space-y-2">
              <Label>اختر الأيقونة</Label>
              <div className="flex gap-2 justify-center flex-wrap">
                {DOSSIER_ICONS.map(item => (
                  <div key={item.id} onClick={() => setSelectedIcon(item.id)} className={cn("p-2 rounded-lg cursor-pointer border-2 transition-all", selectedIcon === item.id ? "border-primary bg-primary/10 scale-110" : "border-transparent hover:bg-secondary")}>
                    <item.icon className={cn("w-6 h-6", item.color)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={!newDossierName || createMutation.isPending} style={{ background: 'var(--gradient-gold)' }}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء الدوسيه"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dossierToEdit} onOpenChange={(open) => !open && setDossierToEdit(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعديل الدوسيه</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم الدوسيه</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUpdate()} />
            </div>
            <div className="space-y-2">
              <Label>الأيقونة</Label>
              <div className="flex gap-2 justify-center flex-wrap">
                {DOSSIER_ICONS.map(item => (
                  <div key={item.id} onClick={() => setEditIcon(item.id)} className={cn("p-2 rounded-lg cursor-pointer border-2 transition-all", editIcon === item.id ? "border-primary bg-primary/10 scale-110" : "border-transparent hover:bg-secondary")}>
                    <item.icon className={cn("w-6 h-6", item.color)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDossierToEdit(null)}>إلغاء</Button>
            <Button onClick={handleUpdate} disabled={!editName || updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              {updateMutation.isPending ? "جاري التحديث..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dossierToDelete} onOpenChange={(open) => !open && setDossierToDelete(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> حذف الدوسيه نهائياً
            </DialogTitle>
            <DialogDescription>
              أنت على وشك حذف دوسيه "{dossierToDelete?.name}".
              <span className="block mt-2 font-bold text-red-500">تحذير: هذا الإجراء سيحذف جميع الملفات الموجودة داخل هذا الدوسيه ولا يمكن التراجع عنه.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDossierToDelete(null)}>تراجع</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Trash2 className="w-4 h-4 ml-2" />}
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DossiersManager;