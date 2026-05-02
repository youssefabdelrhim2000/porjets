import React, { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, Check, Trash2, User, Book, Clock,
  CheckCheck, AlertCircle, Info, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';
import axios from 'axios';

interface Notification {
  id: string | number;
  type: 'entry' | 'system' | 'alert' | string;
  title: string;
  description: string;
  timestamp: string; // From Laravel's created_at
  read: boolean; // Derived from read_at
  user?: string;
}

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotificationsSheet: React.FC<NotificationsSheetProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  
  // Real States
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Fetch Notifications from Laravel
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/notifications');
      // نفترض إن لارافل بيرجع الداتا في response.data.data
      setNotifications(response.data.data || response.data || []);
    } catch (error: unknown) {
      console.error('Error fetching notifications:', error);
      toast({ title: 'خطأ', description: 'فشل جلب الإشعارات', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch data only when the sheet is opened
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string | number) => {
    try {
      // Optimistic UI Update (لتسريع الاستجابة للمستخدم)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      
      await api.put(`/notifications/${id}/read`);
    } catch (error) {
      // Revert if failed
      fetchNotifications();
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء تحديث الإشعار', variant: 'destructive' });
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setIsActionLoading(true);
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل تحديد الكل كمقروء', variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const deleteNotification = async (id: string | number) => {
    try {
      // Optimistic delete
      setNotifications(prev => prev.filter(n => n.id !== id));
      await api.delete(`/notifications/${id}`);
    } catch (error) {
      fetchNotifications(); // Revert
      toast({ title: 'خطأ', description: 'فشل حذف الإشعار', variant: 'destructive' });
    }
  };

  const clearAll = async () => {
    if (notifications.length === 0) return;
    setIsActionLoading(true);
    try {
      await api.delete('/notifications/clear-all');
      setNotifications([]);
      toast({ title: 'تم', description: 'تم مسح جميع الإشعارات بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل مسح الإشعارات', variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'منذ فترة';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'entry': return <Book className="w-4 h-4" />;
      case 'alert': return <AlertCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'entry': return 'bg-primary/20 text-primary';
      case 'alert': return 'bg-accent/20 text-accent';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[320px] sm:w-[400px] bg-card border-border" dir="rtl">
        <SheetHeader className="text-right">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5" />
              الإشعارات
              {unreadCount > 0 && (
                <Badge className="bg-accent text-accent-foreground text-xs">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
          </div>
          <SheetDescription className="text-muted-foreground">
            آخر التحديثات والإشعارات
          </SheetDescription>
        </SheetHeader>

        {/* Actions */}
        {notifications.length > 0 && !isLoading && (
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs"
              onClick={markAllAsRead}
              disabled={isActionLoading || unreadCount === 0}
            >
              {isActionLoading ? <Loader2 className="w-3 h-3 ml-1 animate-spin" /> : <CheckCheck className="w-3 h-3 ml-1" />}
              تحديد الكل كمقروء
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs text-accent border-accent/50"
              onClick={clearAll}
              disabled={isActionLoading}
            >
              {isActionLoading ? <Loader2 className="w-3 h-3 ml-1 animate-spin" /> : <Trash2 className="w-3 h-3 ml-1" />}
              مسح الكل
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <div className="mt-6 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">جاري تحميل الإشعارات...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">لا توجد إشعارات</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`relative p-4 rounded-xl border transition-all ${
                  notification.read 
                    ? 'bg-secondary/30 border-border/30' 
                    : 'bg-primary/5 border-primary/30'
                }`}
              >
                {/* Unread indicator */}
                {!notification.read && (
                  <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}

                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-foreground line-clamp-1">
                      {notification.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.description}
                    </p>
                    
                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(notification.timestamp)}
                      </span>
                      {notification.user && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {notification.user}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => markAsRead(notification.id)}
                        title="تحديد كمقروء"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-accent hover:bg-accent/10"
                      onClick={() => deleteNotification(notification.id)}
                      title="حذف الإشعار"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationsSheet;