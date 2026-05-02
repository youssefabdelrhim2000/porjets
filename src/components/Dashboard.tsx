import React, { useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useDialogState } from '@/hooks/useDialogState';
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  LogOut, Plus, Book, Settings, Bell, UserCog, FolderOpen,
  ClipboardList, Shield, RefreshCw, Loader2
} from 'lucide-react';
import api from '@/lib/axios';
import type { Notebook } from '@/types/notebook';
import logo from '@/assets/logo.png';

// Components
import CreateNotebookDialog from './CreateNotebookDialog';
import EditNotebookDialog from './EditNotebookDialog';
import DeleteNotebookDialog from './DeleteNotebookDialog';
import UserManagement from './UserManagement';
import SettingsSheet from './SettingsSheet';
import NotificationsSheet from './NotificationsSheet';
import SpaceBackground from './SpaceBackground';
import { SearchInput } from '@/components/common/SearchInput';
import { SectionTitle } from '@/components/common/SectionTitle';
import { NotebooksGrid } from '@/components/notebook/NotebooksGrid';
import DossiersManager from '../pages/DossiersManager';
import GlobalSearch from './GlobalSearch';

const DIALOG_NAMES = [
  'create', 'edit', 'delete', 'userManagement',
  'settings', 'notifications', 'documents'
] as const;

type DialogName = typeof DIALOG_NAMES[number];

interface DashboardProps {
  onOpenNotebook: (notebookId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onOpenNotebook }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showStars } = useTheme();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'dossiers' ? 'dossiers' : 'notebooks';
  const searchQuery = searchParams.get('search') || '';

  const { openDialog, closeDialog, isDialogOpen, getDialogData } = useDialogState<DialogName>(DIALOG_NAMES);

  const isAdmin = user?.role === 'admin';
  const hasPermission = useCallback((permission: string) => {
    if (isAdmin) return true;
    return user?.permissions?.includes(permission) || false;
  }, [isAdmin, user?.permissions]);

  // 🚀 التحديث الهندسي الأول: Lazy Loading & Caching
  const { data: notebooks = [], isLoading: isLoadingNotebooks, isFetching: isFetchingNotebooks } = useQuery({
    queryKey: ['notebooks', searchQuery],
    queryFn: async () => {
      const response = await api.get('/notebooks', {
        params: {
          per_page: 100,
          search: searchQuery || undefined,
        },
      });
      return response.data.data || [];
    },
    // السحر هنا: مفيش ريكويست هيتبعت للسيرفر إلا لو اليوزر فاتح تبويب الدفاتر!
    enabled: activeTab === 'notebooks',
    // حفظ الداتا في الكاش لمدة 5 دقايق عشان التنقل بين التبويبات يكون لحظي
    staleTime: 1000 * 60 * 5, 
  });

  const { data: unreadNotificationsCount = 0 } = useQuery({
    queryKey: ['unread_notifications_count'],
    queryFn: async ({ signal }) => {
      const response = await api.get('/notifications/unread-count', {
        signal,
        timeout: 15000,
      });
      return response.data.count ?? response.data.data?.count ?? 0;
    },
    refetchInterval: 5 * 60 * 1000, // كل 5 دقايق بدل دقيقتين — تخفيف على السيرفر
    staleTime:       5 * 60 * 1000,
    retry: false,                   // لو فشل ما يحاولش تاني — مش بيانات حرجة
    refetchOnWindowFocus: false,
  });

  const handleRefresh = useCallback(() => {
    if (activeTab === 'notebooks') {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
    }
    queryClient.invalidateQueries({ queryKey: ['unread_notifications_count'] });
    closeDialog('create'); closeDialog('edit'); closeDialog('delete');
  }, [activeTab, queryClient, closeDialog]);

  const filteredNotebooks = useMemo(() => notebooks, [notebooks]);

  const selectedNotebook = getDialogData<Notebook>('edit') || getDialogData<Notebook>('delete');
  // const handleEditNotebook = useCallback((notebook: Notebook) => openDialog('edit', notebook), [openDialog]);
  const handleEditNotebook = useCallback(async (notebook: Notebook) => {
      try {
        // 1. بنكلم السيرفر نجيب الدفتر كامل بكل حقوله
        const response = await api.get(`/notebooks/${notebook.id}`);
        
        // 2. بناخد الداتا الكاملة اللي رجعت
        const fullNotebook = response.data.data || response.data;
        
        // 3. بنبعت الدفتر "الكامل" للنافذة ونفتحها
        openDialog('edit', fullNotebook);
      } catch (error) {
        console.error("فشل في تحميل بيانات الدفتر للتعديل", error);
        toast({ 
          title: "خطأ", 
          description: "لم نتمكن من جلب تفاصيل الدفتر للتعديل.", 
          variant: "destructive" 
        });
      }
  }, [openDialog, toast]);
  const handleDeleteNotebook = useCallback((notebook: Notebook) => openDialog('delete', notebook), [openDialog]);

  const isGlobalLoading = activeTab === 'notebooks' && isFetchingNotebooks;

  const handleTabChange = useCallback((tab: 'notebooks' | 'dossiers') => {
    setSearchParams({ tab });
  }, [setSearchParams]);

  const handleSearchChange = useCallback((query: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (query) {
      newParams.set('search', query);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handleOpenNotifications = () => {
    openDialog('notifications');
  };

  return (
    <div className="min-h-screen bg-background relative">
      {showStars && <SpaceBackground />}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <img src={logo} alt="Logo" className="relative w-14 h-14 lg:w-16 lg:h-16 object-contain" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg lg:text-xl font-bold text-foreground">لوحة التحكم</h1>
                <p className="text-xs text-muted-foreground">
                  {activeTab === 'notebooks' ? 'قطاع الشهيد / باسم عادل وحدة الامن والتحريات' : 'أرشيف الملفات الإلكتروني'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasPermission('manage_users') && (
                <Button variant="ghost" size="icon" onClick={() => openDialog('userManagement')} title="إدارة المستخدمين">
                  <UserCog className="w-5 h-5 text-muted-foreground" />
                </Button>
              )}

              {/* 🚀 زرار الإشعارات مع الـ Badge */}
              <Button variant="ghost" size="icon" className="relative" onClick={handleOpenNotifications}>
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 border-2 border-background rounded-full animate-in zoom-in">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </Button>

              {isAdmin && (
                <Button variant="ghost" size="icon" onClick={() => openDialog('settings')}>
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleRefresh} title="تحديث البيانات">
                <RefreshCw className={`w-5 h-5 text-muted-foreground ${isGlobalLoading ? 'animate-spin' : ''}`} />
              </Button>

              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-secondary/30 rounded-xl border border-border/20">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{user?.display_name}</p>
                  <p className="text-xs text-muted-foreground">{isAdmin ? 'مدير النظام' : 'مستخدم'}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={logout} className="border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground">
                <LogOut className="w-4 h-4 ml-2" /> <span className="hidden sm:inline">خروج</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* Navigation Buttons */}
        {activeTab === 'notebooks' && (
          <>
            <div className="mb-8 animate-fade-in"><p className="text-muted-foreground">إدارة الدفاتر والبيانات من مكان واحد</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>

              {hasPermission('create_notebooks') && (
                <Button onClick={() => openDialog('create')} className="h-16 px-6 font-bold text-lg justify-start gap-4 focus-visible:ring-4" style={{ background: 'var(--gradient-gold)', boxShadow: 'var(--shadow-gold)' }}>
                  <div className="w-10 h-10 rounded-lg bg-background/20 flex items-center justify-center"><Plus className="w-5 h-5" /></div>
                  <div className="text-right"><span className="block">إضافة دفتر جديد</span><span className="text-xs opacity-80 font-normal">دفاتر السجلات</span></div>
                </Button>
              )}

              <Button variant="outline" onClick={() => handleTabChange('dossiers')} className="h-16 px-6 font-bold text-lg justify-start gap-4 border-muted/50 hover:bg-secondary/50">
                <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-muted-foreground" /></div>
                <div className="text-right"><span className="block text-foreground">الأرشيف والدوسيهات</span><span className="text-xs text-muted-foreground font-normal">ملفات - صور - وثائق</span></div>
              </Button>
              <Button variant="outline" onClick={() => navigate('/documents')} className="h-16 px-6 font-bold text-lg justify-start gap-4 border-primary/30 hover:bg-primary/10">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center"><FolderOpen className="w-5 h-5 text-primary" /></div>
                <div className="text-right"><span className="block text-foreground">وثائق التعارف</span><span className="text-xs text-muted-foreground font-normal">أفراد - معاونين - مجندين</span></div>
              </Button>
            </div>
            {/* البحث الشامل في كل السجلات */}
            <div className="mb-4 animate-fade-in" style={{ animationDelay: '0.12s' }}>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                بحث شامل في جميع الدفاتر والسجلات
              </p>
              <GlobalSearch onOpenNotebook={onOpenNotebook} />
            </div>

            {/* البحث عن اسم دفتر */}
            {/* <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <SearchInput value={searchQuery} onChange={handleSearchChange} placeholder="البحث عن دفتر بالاسم..." className="flex-1 max-w-xl" />
            </div> */}
            <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <SectionTitle icon={Book} title="الدفاتر" count={filteredNotebooks.length} />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.25s' }}>
              {isLoadingNotebooks && notebooks.length === 0 ? (
                <div className="flex justify-center items-center py-20 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
                  جاري تحميل الدفاتر...
                </div>
              ) : (
                <NotebooksGrid
                  notebooks={filteredNotebooks}
                  searchQuery={searchQuery}
                  isAdmin={isAdmin}
                  onOpenNotebook={onOpenNotebook}
                  onEditNotebook={hasPermission('edit_notebooks') ? handleEditNotebook : undefined}
                  onDeleteNotebook={hasPermission('edit_notebooks') ? handleDeleteNotebook : undefined}
                  onCreateNotebook={() => openDialog('create')}
                />
              )}
            </div>
          </>
        )}
        {/* Dossiers */}
        {activeTab === 'dossiers' && (
          <DossiersManager
            hasPermission={hasPermission}
            onBack={() => handleTabChange('notebooks')}
          />
        )}
      </main>
      {/* Dialogs */}
      <CreateNotebookDialog open={isDialogOpen('create')} onOpenChange={(open) => !open && closeDialog('create')} onSuccess={handleRefresh} />

      {(isAdmin || hasPermission('edit_notebooks')) && (
        <>
          <EditNotebookDialog open={isDialogOpen('edit')} onOpenChange={(open) => !open && closeDialog('edit')} notebook={selectedNotebook} onSuccess={handleRefresh} />
          <DeleteNotebookDialog open={isDialogOpen('delete')} onOpenChange={(open) => !open && closeDialog('delete')} notebook={selectedNotebook} onSuccess={handleRefresh} />
        </>
      )}
      {hasPermission('manage_users') && (
        <UserManagement open={isDialogOpen('userManagement')} onOpenChange={(open) => !open && closeDialog('userManagement')} />
      )}
      <SettingsSheet open={isDialogOpen('settings')} onOpenChange={(open) => !open && closeDialog('settings')} />
      <NotificationsSheet open={isDialogOpen('notifications')} onOpenChange={(open) => !open && closeDialog('notifications')} />
    </div>
  );
};

export default Dashboard;