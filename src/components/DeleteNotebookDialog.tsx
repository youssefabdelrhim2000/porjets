import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query'; 
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import type { Notebook } from '@/types/notebook';
import { useToast } from "@/hooks/use-toast";

interface DeleteNotebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebook: Notebook | null;
  onSuccess: () => void;
}

const DeleteNotebookDialog: React.FC<DeleteNotebookDialogProps> = ({ 
  open, 
  onOpenChange, 
  notebook, 
  onSuccess 
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ==========================================
  // 🌟 Optimistic Update Logic لحذف الدفتر
  // ==========================================
  const deleteMutation = useMutation({
    mutationFn: async (notebookId: string | number) => {
      await api.delete(`/notebooks/${notebookId}`);
    },
    onMutate: async (deletedNotebookId) => {
      await queryClient.cancelQueries({ queryKey: ['notebooks'] });
      
      const previousNotebooks = queryClient.getQueryData<Notebook[]>(['notebooks']);

      // بنمسح الدفتر من الشاشة فوراً
      queryClient.setQueryData<Notebook[]>(['notebooks'], (old) => {
        return old?.filter((nb) => nb.id !== deletedNotebookId) || [];
      });

      // نقفل الديالوج في نفس اللحظة
      onOpenChange(false);
      onSuccess(); 

      toast({
        title: "تم الحذف",
        description: "تم حذف الدفتر وجميع سجلاته بنجاح",
      });

      return { previousNotebooks };
    },
    onError: (err, deletedNotebookId, context) => {
      // لو السيرفر وقع، بنرجع الدفتر تاني للشاشة
      if (context?.previousNotebooks) {
        queryClient.setQueryData(['notebooks'], context.previousNotebooks);
      }
      
      console.error("Delete error:", err);
      toast({
        title: "خطأ",
        description: "فشل حذف الدفتر، تأكد من الاتصال بالسيرفر",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    }
  });

  const handleDelete = () => {
    if (!notebook) return;
    deleteMutation.mutate(notebook.id);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!notebook) return null;

  // 🌟 السحر كله هنا: بنشيك إن اللودينج ده يخص الدفتر اللي مفتوح حالياً مش دفتر قديم
  const isCurrentlyDeletingThis = deleteMutation.isPending && deleteMutation.variables === notebook.id;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md bg-card border-border" dir="rtl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-accent/10 rounded-full">
              <AlertTriangle className="w-6 h-6 text-accent" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              حذف الدفتر
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground text-right">
            <span className="block mb-4">
              أنت على وشك حذف الدفتر <strong className="text-foreground">"{notebook.name}"</strong> وجميع السجلات المرتبطة به بشكل نهائي.
            </span>
            <span className="block mb-2 text-accent">
              ⚠️ هذا الإجراء لا يمكن التراجع عنه!
            </span>
            <span className="block text-xs text-muted-foreground">
              اضغط "حذف نهائياً" للتأكيد.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex gap-3 sm:flex-row-reverse">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={isCurrentlyDeletingThis} // 🌟 استخدام المتغير الجديد
          >
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isCurrentlyDeletingThis} // 🌟 استخدام المتغير الجديد
            className="flex-1"
          >
            {isCurrentlyDeletingThis ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الحذف...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 ml-2" />
                حذف نهائياً
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteNotebookDialog;