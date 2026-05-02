// ============================================
// DateField Component
// Shadcn Popover + Calendar Date Picker
// ============================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import type { FieldDefinition } from '@/types/notebook';

interface DateFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const DateField: React.FC<DateFieldProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const [open, setOpen] = useState(false);
  
  // تحويل النص اللي جاي من الداتا لـ Date Object عشان الكاليندر
  const date = value ? new Date(value) : undefined;

  return (
    <div className="space-y-1 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={field.id}
            className={`w-full justify-start font-normal text-right bg-input/50 transition-colors ${
              !date ? "text-muted-foreground" : "text-foreground"
            } ${error ? "border-accent" : "border-border/50"}`}
            dir="rtl"
          >
            <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
            {date ? date.toLocaleDateString('ar-EG') : <span>اختر {field.name}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            captionLayout="dropdown" // 🚀 ميزة الـ Dropdown اللي أنت عايزها للسنين والشهور
            onSelect={(selectedDate) => {
              if (selectedDate) {
                // تحويل التاريخ لـ String (YYYY-MM-DD) عشان Laravel يوافق عليه
                const year = selectedDate.getFullYear();
                const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const day = String(selectedDate.getDate()).padStart(2, '0');
                onChange(`${year}-${month}-${day}`);
              } else {
                onChange('');
              }
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-accent mt-1">{error}</p>}
    </div>
  );
};