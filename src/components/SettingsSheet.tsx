import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Moon, Sun, Bell, Shield, Database, Trash2, 
  Download, Upload, RefreshCw, Sparkles
} from 'lucide-react';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsSheet: React.FC<SettingsSheetProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { theme, setTheme, showStars, setShowStars } = useTheme();
  const isAdmin = user?.role === 'admin';

  const handleClearData = () => {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[320px] sm:w-[400px] bg-card border-border" dir="rtl">
        <SheetHeader className="text-right">
          <SheetTitle className="text-foreground">الإعدادات</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            تخصيص إعدادات النظام
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          {/* Display Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
              العرض
            </h3>
            <div className="space-y-3 mr-6">
              {/* Theme Toggle Buttons */}
              <div className="flex gap-3 p-3 bg-secondary/50 rounded-xl border border-border">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                    theme === 'light' 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Sun className="w-5 h-5" />
                  <span>نهاري</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                    theme === 'dark' 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  <span>ليلي</span>
                </button>
              </div>
              
              {/* Stars Background Toggle */}
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl border border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <Label htmlFor="stars-bg" className="text-sm text-foreground">
                    خلفية النجوم
                  </Label>
                </div>
                <Switch 
                  id="stars-bg" 
                  checked={showStars}
                  onCheckedChange={setShowStars}
                />
              </div>
            </div>
          </div>
          {/* Version Info */}
          <div className="pt-4 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              نظام إدارة الدفاتر - الإصدار 1.0.0
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsSheet;
