import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

import { ScrollArea } from "@/components/ui/scroll-area";

import { 
  UserPlus, Users, Trash2, AlertCircle, CheckCircle2, 
  User, Lock, Search, Eye, EyeOff, Shield, Crown, Settings2, Loader2, Pencil
} from 'lucide-react';

import api from '@/lib/axios';
import axios from 'axios'; // 👈 ضروري عشان الـ Error Handling
import { useToast } from "@/hooks/use-toast";
import type { RegisteredUser, UserPermission } from '@/types/notebook';

interface UserManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 👈 FlowCube Standard: Type definition for Edit Payload
interface UpdateUserPayload {
  display_name: string;
  username: string;
  password?: string;
}

const PERMISSIONS_LIST: { id: UserPermission; label: string; description: string }[] = [
  // صلاحيات الدفاتر
  { id: 'create_notebooks', label: 'إنشاء دفاتر', description: 'السماح بإضافة دفاتر جديدة للنظام' },
  { id: 'add_entries', label: 'إضافة بيانات للدفاتر', description: 'السماح بإدخال سجلات وبيانات داخل الدفاتر' },
  { id: 'edit_notebooks', label: 'تعديل وحذف الدفاتر', description: 'السماح بتعديل أو حذف الدفاتر وبياناتها' },
  
  // صلاحيات وثائق التعارف
  { id: 'add_documents', label: 'إضافة وثائق', description: 'السماح بإنشاء وثائق تعارف جديدة' },
  { id: 'upload_document_files', label: 'رفع ملفات للوثائق', description: 'السماح برفع الصور والملفات داخل الوثائق' },
  { id: 'edit_documents', label: 'تعديل وحذف الوثائق', description: 'السماح بتعديل أو حذف وثائق التعارف' },

  // صلاحيات الدوسيهات
  { id: 'add_dossiers', label: 'إضافة دوسيهات', description: 'السماح بإنشاء دوسيهات جديدة' },
  { id: 'upload_dossier_files', label: 'رفع ملفات للدوسيهات', description: 'السماح برفع الصور والملفات داخل الدوسيهات' },
  { id: 'edit_dossiers', label: 'تعديل وحذف الدوسيهات', description: 'السماح بتعديل أو حذف الدوسيهات' },

  // صلاحيات عامة للإدارة
  { id: 'import_export_data', label: 'استيراد وتصدير البيانات', description: 'السماح برفع ملفات Excel وتحميل البيانات' },
  { id: 'view_audit', label: 'عرض سجل التتبع', description: 'السماح برؤية سجل الحركات (من أضاف/عدّل)' },
  { id: 'manage_users', label: 'إدارة المستخدمين', description: 'السماح بإضافة وحذف وتعديل صلاحيات المستخدمين' },
];

const UserManagement: React.FC<UserManagementProps> = ({ open, onOpenChange }) => {
  // --- States ---
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');

  // Edit Form States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<RegisteredUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [selectedUser, setSelectedUser] = useState<RegisteredUser | null>(null);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { toast } = useToast();

  // --- 1. Fetch Users ---
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      const normalized = (response.data.data || []).map((u: {
        id?: string | number;
        username?: string;
        displayName?: string;
        display_name?: string;
        role?: string;
        permissions?: string[];
        createdAt?: string;
        created_at?: string;
      }) => ({
        id: String(u.id),
        username: u.username ?? '',
        displayName: u.displayName ?? u.display_name ?? '',
        role: u.role === 'admin' ? 'admin' : 'user',
        permissions: Array.isArray(u.permissions) ? u.permissions : [],
        createdAt: u.createdAt ?? u.created_at ?? '',
      }));
      setUsers(normalized);
    } catch (err) {
      console.error(err);
      toast({ title: "خطأ", description: "فشل تحميل المستخدمين", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open, fetchUsers]);

  // 👈 FlowCube Standard: Memoize filtered results for performance
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const lowerQuery = searchQuery.toLowerCase();
    return users.filter(u => 
      u.username.toLowerCase().includes(lowerQuery) ||
      u.displayName.toLowerCase().includes(lowerQuery)
    );
  }, [users, searchQuery]);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setDisplayName('');
    setNewUserRole('user');
    setError('');
    setSuccess('');
  };

  // --- 2. Add User ---
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || username.length < 3) {
      setError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (!displayName.trim()) {
      setError('يرجى إدخال الاسم الكامل');
      return;
    }

    const defaultPermissions: UserPermission[] = newUserRole === 'admin' 
      ? PERMISSIONS_LIST.map(p => p.id)
      : [];

    setActionLoading(true);

    try {
      await api.post('/users', {
        username: username.trim(),
        password: password.trim(),
        display_name: displayName.trim(),
        role: newUserRole,
        permissions: defaultPermissions
      });
      
      setSuccess('تم إضافة المستخدم بنجاح');
      fetchUsers();
      setTimeout(() => {
        resetForm();
        setShowAddForm(false);
      }, 1000);

    } catch (err: unknown) {
      // 👈 Fix: Proper Error Handling without 'any'
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'فشل إضافة المستخدم';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // --- 3. Open Edit Dialog ---
  const handleOpenEdit = (user: RegisteredUser) => {
    setEditingUser(user);
    setEditName(user.displayName);
    setEditUsername(user.username);
    setEditPassword(''); 
    setError('');
    setIsEditOpen(true);
  };

  // --- 4. Submit Edit ---
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setError('');
    setActionLoading(true);

    try {
        // 👈 Fix: Typed Payload
        const payload: UpdateUserPayload = {
            display_name: editName,
            username: editUsername,
        };

        if (editPassword.trim().length > 0) {
            if (editPassword.length < 6) {
                setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
                setActionLoading(false);
                return;
            }
            payload.password = editPassword;
        }

        await api.put(`/users/${editingUser.id}`, payload);
        
        toast({ title: "تم التعديل", description: "تم تحديث بيانات المستخدم بنجاح" });
        setIsEditOpen(false);
        fetchUsers();

    } catch (err: unknown) {
        const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'فشل تحديث البيانات';
        setError(msg);
    } finally {
        setActionLoading(false);
    }
  };

  // --- 5. Delete User ---
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

    try {
      await api.delete(`/users/${userId}`);
      toast({ title: "تم الحذف", description: "تم حذف المستخدم بنجاح" });
      fetchUsers();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'فشل الحذف';
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    }
  };

  // --- 6. Toggle Role ---
  const handleToggleAdmin = async (user: RegisteredUser) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const newPermissions = newRole === 'admin' ? PERMISSIONS_LIST.map(p => p.id) : user.permissions;

    // Optimistic Update
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole, permissions: newPermissions } : u));

    try {
      await api.put(`/users/${user.id}`, {
        role: newRole,
        permissions: newPermissions
      });
      toast({ title: "تم", description: "تم تحديث دور المستخدم بنجاح" });
    } catch (err: unknown) {
      // Rollback on failure
      fetchUsers();
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'فشل تحديث الدور';
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    }
  };

  // --- 7. Permissions Management ---
  const handleOpenPermissions = (user: RegisteredUser) => {
    setSelectedUser(user);
    setIsPermissionsOpen(true);
  };

  const handleTogglePermission = async (permissionId: UserPermission) => {
    if (!selectedUser) return;
    
    // 👈 Fix: Save previous state for Rollback
    const previousUser = { ...selectedUser };
    const currentPermissions = selectedUser.permissions || [];
    
    const newPermissions = currentPermissions.includes(permissionId)
      ? currentPermissions.filter(p => p !== permissionId)
      : [...currentPermissions, permissionId];
    
    const updatedUser = { ...selectedUser, permissions: newPermissions };
    
    // Optimistic UI Update
    setSelectedUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));

    try {
      await api.put(`/users/${selectedUser.id}`, { permissions: newPermissions });
    } catch (err: unknown) {
      // 👈 Fix: Rollback if API fails
      setSelectedUser(previousUser);
      setUsers(prev => prev.map(u => u.id === previousUser.id ? previousUser : u));
      toast({ title: "خطأ", description: "فشل تحديث الصلاحيات. تأكد من اتصالك.", variant: "destructive" });
    }
  };

  const handleBulkPermissions = async (ids: UserPermission[]) => {
      if (!selectedUser) return;
      
      const previousUser = { ...selectedUser };
      const updatedUser = { ...selectedUser, permissions: ids };
      
      setSelectedUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));

      try { 
        await api.put(`/users/${selectedUser.id}`, { permissions: ids }); 
      } catch (err: unknown) { 
        setSelectedUser(previousUser);
        setUsers(prev => prev.map(u => u.id === previousUser.id ? previousUser : u));
        toast({ title: "خطأ", description: "فشل تحديث الصلاحيات.", variant: "destructive" });
      }
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  return (
    // ... (Your Return Statement and UI remain exactly the same) ...
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              إدارة المستخدمين والصلاحيات
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="البحث عن مستخدم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 text-right"
                  dir="rtl"
                />
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setShowAddForm(!showAddForm);
                }}
                style={{ background: 'var(--gradient-gold)', boxShadow: 'var(--shadow-gold)' }}
              >
                <UserPlus className="w-5 h-5 ml-2" />
                إضافة مستخدم
              </Button>
            </div>

            {/* Add User Form */}
            {showAddForm && (
              <div className="p-6 bg-secondary/30 rounded-xl border border-border/50 animate-fade-in">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  إضافة مستخدم جديد
                </h3>
                <form onSubmit={handleAddUser} className="space-y-4">
                  {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  {success && <Alert className="border-emerald-500/50"><AlertDescription className="text-emerald-500">{success}</AlertDescription></Alert>}

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>الاسم الكامل</Label>
                      <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="text-right" dir="rtl" />
                    </div>
                    <div className="space-y-2">
                      <Label>اسم المستخدم</Label>
                      <Input value={username} onChange={(e) => setUsername(e.target.value)} className="text-right" dir="rtl" />
                    </div>
                    <div className="space-y-2">
                      <Label>كلمة المرور</Label>
                      <Input value={password} onChange={(e) => setPassword(e.target.value)} className="text-right" dir="rtl" />
                    </div>
                    <div className="space-y-2">
                      <Label>نوع الحساب</Label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setNewUserRole('user')} className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-all flex items-center justify-center gap-2 ${newUserRole === 'user' ? 'border-primary bg-primary/20 text-primary' : 'border-border/50 bg-secondary/30 text-muted-foreground'}`}><Shield className="w-4 h-4" /> مستخدم</button>
                        <button type="button" onClick={() => setNewUserRole('admin')} className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-all flex items-center justify-center gap-2 ${newUserRole === 'admin' ? 'border-primary bg-primary/20 text-primary' : 'border-border/50 bg-secondary/30 text-muted-foreground'}`}><Crown className="w-4 h-4" /> مسؤول</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <Button type="button" variant="outline" onClick={() => { resetForm(); setShowAddForm(false); }}>إلغاء</Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={actionLoading}>{actionLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <UserPlus className="w-4 h-4 ml-2" />} إضافة</Button>
                  </div>
                </form>
              </div>
            )}

            {/* Users Table */}
            <div className="border border-border/50 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30">
                    <TableHead className="text-right font-bold">المستخدم</TableHead>
                    <TableHead className="text-right font-bold">اسم المستخدم</TableHead>
                    <TableHead className="text-right font-bold w-40">كلمة المرور</TableHead>
                    <TableHead className="text-right font-bold">الدور</TableHead>
                    <TableHead className="text-right font-bold">الصلاحيات</TableHead>
                    <TableHead className="text-center font-bold w-40">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /><p className="text-muted-foreground mt-2">جاري تحميل المستخدمين...</p></TableCell></TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12"><Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج' : 'لا يوجد مستخدمين مسجلين'}</p></TableCell></TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-secondary/20">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${user.role === 'admin' ? 'bg-primary/20' : 'bg-secondary'}`}>
                              {user.role === 'admin' ? <Crown className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <span className="font-medium">{user.displayName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{user.username}</TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2 bg-background/50 p-1.5 rounded-md border border-border/30 w-fit">
                            <span className="font-mono text-sm min-w-[80px]">
                              {showPasswords[user.id] ? (user.password || 'غير متوفر') : '••••••'}
                            </span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => togglePasswordVisibility(user.id)}>
                              {showPasswords[user.id] ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                            </Button>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className={user.role === 'admin' ? 'bg-primary text-primary-foreground' : ''}>
                            {user.role === 'admin' ? 'مسؤول' : 'مستخدم'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{user.permissions?.length || 0} صلاحية</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {/* زر تعديل البيانات */}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-100" onClick={() => handleOpenEdit(user)} title="تعديل البيانات">
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleOpenPermissions(user)} title="إدارة الصلاحيات">
                              <Settings2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className={`h-8 w-8 ${user.role === 'admin' ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => handleToggleAdmin(user)} title="تبديل الدور">
                              <Crown className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteUser(user.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="text-center text-sm text-muted-foreground p-4 bg-secondary/20 rounded-xl">
              <p>يمكنك منح صلاحيات مخصصة لكل مستخدم أو ترقيته لمسؤول بكامل الصلاحيات</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
                <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                
                <div className="space-y-2">
                    <Label>الاسم الكامل</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-right" />
                </div>
                <div className="space-y-2">
                    <Label>اسم المستخدم</Label>
                    <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="text-right" />
                </div>
                <div className="space-y-2">
                    <Label>كلمة المرور الجديدة (اختياري)</Label>
                    <Input value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="اتركها فارغة إذا لم ترد التغيير" className="text-right" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>إلغاء</Button>
                <Button onClick={handleUpdateUser} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    حفظ التعديلات
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Sheet */}
      <Sheet open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <SheetContent side="left" className="w-[350px] sm:w-[450px] bg-card border-border flex flex-col h-full" dir="rtl">
          
          <SheetHeader className="text-right shrink-0">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <Settings2 className="w-5 h-5 text-primary" />
              صلاحيات {selectedUser?.displayName}
            </SheetTitle>
            <SheetDescription className="text-muted-foreground">اختر الصلاحيات التي تريد منحها لهذا المستخدم</SheetDescription>
          </SheetHeader>

          {/* 🚀 هنا التغيير المعلم: استخدمنا ScrollArea بدل الـ div */}
          <ScrollArea className="flex-1 mt-6 pr-4 -mr-4">
            {/* 🚀 لازم نحط div جوه الـ ScrollArea عشان الـ spacing (space-y-4) يشتغل صح */}
            <div className="space-y-4 pb-4">
              {selectedUser && (
                <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-xl border border-border/50">
                  <div className={`p-3 rounded-lg ${selectedUser.role === 'admin' ? 'bg-primary/20' : 'bg-secondary'}`}>
                    {selectedUser.role === 'admin' ? <Crown className="w-6 h-6 text-primary" /> : <User className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{selectedUser.displayName}</p>
                    <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                  </div>
                  <Badge className={`mr-auto ${selectedUser.role === 'admin' ? 'bg-primary text-primary-foreground' : ''}`} variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                    {selectedUser.role === 'admin' ? 'مسؤول' : 'مستخدم'}
                  </Badge>
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground mb-3">الصلاحيات المتاحة</h3>
                {PERMISSIONS_LIST.map((permission) => (
                  <div key={permission.id} className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg border border-border/30 hover:border-primary/30 transition-colors">
                    <Checkbox id={permission.id} checked={selectedUser?.permissions?.includes(permission.id) || false} onCheckedChange={() => handleTogglePermission(permission.id)} className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor={permission.id} className="text-sm font-medium text-foreground cursor-pointer">{permission.label}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{permission.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>

          <div className="flex gap-2 pt-4 border-t border-border/50 shrink-0 mt-auto">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleBulkPermissions(PERMISSIONS_LIST.map(p => p.id))}>تحديد الكل</Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleBulkPermissions([])}>إلغاء الكل</Button>
          </div>

        </SheetContent>
      </Sheet>
    </>
  );
};

export default UserManagement;