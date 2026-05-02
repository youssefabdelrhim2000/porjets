// ============================================
// SearchInput Component
// Reusable search input with icon
// ============================================

import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showClear?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'البحث...',
  className = '',
  showClear = true,
}) => {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-12 h-12 bg-card/50 border-border/50 text-right"
        dir="rtl"
      />
      {showClear && value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8"
          onClick={() => onChange('')}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
