// ============================================
// PageHeader Component
// Reusable header with logo and actions
// ============================================

import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Shield } from 'lucide-react';
import logo from '@/assets/logo-optimized.png';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  userDisplayName?: string;
  isAdmin?: boolean;
  onLogout?: () => void;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  userDisplayName,
  isAdmin,
  onLogout,
  actions,
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <img 
                src={logo} 
                alt="Logo" 
                className="relative w-14 h-14 lg:w-16 lg:h-16 object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg lg:text-xl font-bold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {actions}

            {/* User Info */}
            {userDisplayName && (
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-secondary/30 rounded-xl border border-border/20">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{userDisplayName}</p>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground">مدير النظام</p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
              </div>
            )}

            {/* Logout */}
            {onLogout && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onLogout}
                className="border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="w-4 h-4 ml-2" />
                <span className="hidden sm:inline">خروج</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
