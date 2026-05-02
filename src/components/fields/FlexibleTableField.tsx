import React from 'react';
import { Plus, Trash2, GripVertical, Settings2, Edit2, X, ChevronDown, Check, Columns } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { FieldDefinition, TableColumn, FlexibleTableValue } from '@/types/notebook';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface FlexibleTableFieldProps {
  field: FieldDefinition;
  value: FlexibleTableValue;
  onChange: (value: FlexibleTableValue) => void;
  error?: string;
}

export const FlexibleTableField: React.FC<FlexibleTableFieldProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  // 🛡️ درع الحماية: بيجبر الجدول ياخد العواميد بتاعة الدفتر لو السجل فاضي
  const getSafeValue = (): FlexibleTableValue => {
    if (!value) return { columns: field.columns || [], rows: [] };
    if (Array.isArray(value)) return { columns: field.columns || [], rows: value };
    if (typeof value === 'object') {
      const hasColumns = value.columns && value.columns.length > 0;
      return { 
        columns: hasColumns ? value.columns : (field.columns || []), 
        rows: value.rows || [] 
      };
    }
    return { columns: field.columns || [], rows: [] };
  };

  const currentTableValue = getSafeValue();
  const currentColumns: TableColumn[] = currentTableValue.columns || [];
  const currentRows: Array<Record<string, string | number | boolean | null>> = currentTableValue.rows || [];

  const [showColumnEditDialog, setShowColumnEditDialog] = React.useState(false);
  const [newColumnName, setNewColumnName] = React.useState('');
  const [newColumnType, setNewColumnType] = React.useState<'text' | 'number' | 'date' | 'compound'>('text');
  const [newColumnSubColumns, setNewColumnSubColumns] = React.useState<TableColumn[]>([]);
  const [newSubColumnName, setNewSubColumnName] = React.useState('');
  const [newSubColumnType, setNewSubColumnType] = React.useState<'text' | 'number' | 'date'>('text');
  const [newColumnOptions, setNewColumnOptions] = React.useState('');

  const [editingColumnId, setEditingColumnId] = React.useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = React.useState('');
  const [editingSubColumnKey, setEditingSubColumnKey] = React.useState<string | null>(null);
  const [editingSubColumnName, setEditingSubColumnName] = React.useState('');

  React.useEffect(() => {
    if (field.columns && field.columns.length > 0 && currentColumns.length === 0) {
      onChange({ ...currentTableValue, columns: field.columns });
    }
  }, [field.columns, currentColumns.length, onChange]);

  React.useEffect(() => {
    if (!field.rowTemplate) return;
    if (currentRows.length > 0) return;
    if (currentColumns.length === 0) return;

    if (field.rowTemplate === 'monthsOfYear') {
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const autoRows = months.map((monthName) => {
        const row: Record<string, string | number | boolean | null | Record<string, string | number | boolean | null>> = {};
        currentColumns.forEach((col, index) => {
          if (index === 0) row[col.id] = monthName;
          else if (col.type === 'compound' && col.subColumns) {
            const subData: Record<string, string | number | boolean | null> = {};
            col.subColumns.forEach((subCol) => { subData[subCol.id] = ''; });
            row[col.id] = subData;
          } else {
            row[col.id] = '';
          }
        });
        return row;
      });
      onChange({ ...currentTableValue, rows: autoRows });
    }
  }, [field.rowTemplate, currentRows.length, currentColumns, currentTableValue, onChange]);

  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم العمود', variant: 'destructive' });
      return;
    }
    if (newColumnType === 'compound' && newColumnSubColumns.length === 0) {
      toast({ title: 'خطأ', description: 'العمود المركب يتطلب أعمدة فرعية واحدة على الأقل', variant: 'destructive' });
      return;
    }

    const parsedOptions = newColumnOptions.split(',').map(o => o.trim()).filter(Boolean);
    const newCol: TableColumn = {
      id: crypto.randomUUID(),
      name: newColumnName.trim(),
      type: newColumnType,
      ...(newColumnType === 'compound' && { subColumns: newColumnSubColumns }),
      ...(newColumnType !== 'compound' && parsedOptions.length > 0 && { options: parsedOptions }),
    };

    const updatedRows = currentRows.map(row => {
      const newRow = { ...row };
      if (newColumnType === 'compound' && newColumnSubColumns.length > 0) {
        const subData: Record<string, string | number | boolean | null> = {};
        newColumnSubColumns.forEach(subCol => { subData[subCol.id] = ''; });
        newRow[newCol.id] = subData;
      } else {
        newRow[newCol.id] = '';
      }
      return newRow;
    });

    onChange({ ...currentTableValue, columns: [...currentColumns, newCol], rows: updatedRows });

    setNewColumnName('');
    setNewColumnType('text');
    setNewColumnSubColumns([]);
    setNewSubColumnName('');
    setNewSubColumnType('text');
    setNewColumnOptions('');
    setShowColumnEditDialog(false);
  };

  const handleDeleteColumn = (columnId: string) => {
    const updatedColumns = currentColumns.filter(col => col.id !== columnId);
    const updatedRows = currentRows.map(row => {
      const newRow = { ...row };
      delete newRow[columnId];
      return newRow;
    });
    onChange({ columns: updatedColumns, rows: updatedRows });
  };

  const handleAddSubColumn = () => {
    if (!newSubColumnName.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم العمود الفرعي', variant: 'destructive' });
      return;
    }
    const newSubCol: TableColumn = { id: crypto.randomUUID(), name: newSubColumnName.trim(), type: newSubColumnType };
    setNewColumnSubColumns(prev => [...prev, newSubCol]);
    setNewSubColumnName('');
    setNewSubColumnType('text');
  };

  const handleDeleteSubColumn = (subColumnId: string) => {
    setNewColumnSubColumns(prev => prev.filter(col => col.id !== subColumnId));
  };

  const handleRenameColumn = (columnId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updated = currentColumns.map(col => col.id === columnId ? { ...col, name: trimmed } : col);
    onChange({ ...currentTableValue, columns: updated });
    setEditingColumnId(null);
    setEditingColumnName('');
  };

  const handleRenameSubColumn = (columnId: string, subColumnId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updated = currentColumns.map(col => {
      if (col.id !== columnId || !col.subColumns) return col;
      return {
        ...col,
        subColumns: col.subColumns.map(sub => sub.id === subColumnId ? { ...sub, name: trimmed } : sub),
      };
    });
    onChange({ ...currentTableValue, columns: updated });
    setEditingSubColumnKey(null);
    setEditingSubColumnName('');
  };

  const handleCellChange = (rowIndex: number, columnId: string, subColumnId: string | null, cellValue: string | number | boolean | null) => {
    const newRows = [...currentRows];
    if (subColumnId) {
      const compoundColumnData = (newRows[rowIndex][columnId] || {}) as Record<string, string | number | boolean | null>;
      newRows[rowIndex] = { ...newRows[rowIndex], [columnId]: { ...compoundColumnData, [subColumnId]: cellValue } };
    } else {
      newRows[rowIndex] = { ...newRows[rowIndex], [columnId]: cellValue };
    }
    onChange({ ...currentTableValue, rows: newRows });
  };

  const handleAddRow = () => {
    const newRow: Record<string, string | number | boolean | null | Record<string, string | number | boolean | null>> = {};
    currentColumns.forEach(col => {
      if (col.type === 'compound' && col.subColumns) {
        const subData: Record<string, string | number | boolean | null> = {};
        col.subColumns.forEach(subCol => { subData[subCol.id] = ''; });
        newRow[col.id] = subData;
      } else {
        newRow[col.id] = '';
      }
    });
    onChange({ ...currentTableValue, rows: [...currentRows, newRow] });
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newRows = currentRows.filter((_, i) => i !== rowIndex);
    onChange({ ...currentTableValue, rows: newRows });
  };

  const getColumnInputType = (type: 'text' | 'number' | 'date' | 'compound') => {
    switch (type) {
      case 'number': return 'number';
      case 'date': return 'date';
      case 'compound': return 'text';
      default: return 'text';
    }
  };

  const renderTableHeader = () => {
    const mainHeaders: JSX.Element[] = [];
    const subHeaders: JSX.Element[] = [];
    const hasCompoundColumns = currentColumns.some(col => col.type === 'compound' && col.subColumns && col.subColumns.length > 0);

    currentColumns.forEach(col => {
      if (col.type === 'compound' && col.subColumns && col.subColumns.length > 0) {
        mainHeaders.push(
          <TableHead key={col.id} colSpan={col.subColumns.length} className="px-3 py-2 text-center text-muted-foreground font-medium border-b border-r border-border/30 last:border-r-0">
            {col.name}
          </TableHead>
        );
        col.subColumns.forEach(subCol => {
          subHeaders.push(
            <TableHead key={subCol.id} className="px-3 py-2 text-right text-muted-foreground font-medium border-r border-border/30 last:border-r-0">
              {subCol.name}
            </TableHead>
          );
        });
      } else {
        mainHeaders.push(
          <TableHead key={col.id} rowSpan={hasCompoundColumns ? 2 : 1} className="px-3 py-2 text-right text-muted-foreground font-medium border-b border-r border-border/30 last:border-r-0">
            {col.name}
          </TableHead>
        );
      }
    });

    return (
      <thead className="bg-secondary/50">
        <tr>
          <th rowSpan={hasCompoundColumns ? 2 : 1} className="px-3 py-2 text-right text-muted-foreground font-medium w-10 border-b border-r border-border/30 last:border-r-0">#</th>
          {mainHeaders}
          <th rowSpan={hasCompoundColumns ? 2 : 1} className="px-3 py-2 w-10 border-b border-border/30"></th>
        </tr>
        {hasCompoundColumns && <tr>{subHeaders}</tr>}
      </thead>
    );
  };

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-secondary/20 rounded-lg border border-border/30">
          <div className="flex-1">
            <Label className="text-sm text-foreground">تعديل هيكل الجدول (الأعمدة)</Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">هذا الجزء خاص بالأدمن فقط، المستخدم العادي يرى الجدول ويدخل بياناته فقط.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowColumnEditDialog(true)} type="button" title="إضافة أو تعديل أسماء الأعمدة">
            <Settings2 className="w-4 h-4 ml-2" /> إدارة الأعمدة
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border/50">
        <Table className="w-full text-sm">
          {renderTableHeader()}
          <tbody>
            {currentRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-border/30">
                <td className="px-3 py-2 text-muted-foreground text-center">{rowIndex + 1}</td>
                {currentColumns.map(col => (
                  col.type === 'compound' && col.subColumns && col.subColumns.length > 0 ? (
                    col.subColumns.map(subCol => (
                      <td key={subCol.id} className="px-2 py-1">
                        <Input
                          type={getColumnInputType(subCol.type)}
                          value={(row[col.id] as Record<string, string | number | boolean | null>)?.[subCol.id]?.toString() || ''}
                          onChange={(e) => handleCellChange(rowIndex, col.id, subCol.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                          className="bg-input/50 border-border/50 text-right h-8 text-sm" dir="rtl"
                        />
                      </td>
                    ))
                  ) : (
                    <td key={col.id} className="px-2 py-1">
                      {col.options && col.options.length > 0 ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full h-8 justify-between bg-input/50 border-border/50 text-right text-xs">
                              <span className="truncate max-w-[85%]">{row[col.id]?.toString() || 'اختر قيمة'}</span>
                              <ChevronDown className="w-3 h-3 ml-1 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto" dir="rtl">
                            {col.options.map((option) => (
                              <DropdownMenuItem key={option} className="flex items-center justify-between text-xs" onClick={() => handleCellChange(rowIndex, col.id, null, option)}>
                                <span>{option}</span>
                                {row[col.id] === option && <Check className="w-3 h-3 text-primary" />}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Input
                          type={getColumnInputType(col.type)}
                          value={row[col.id]?.toString() || ''}
                          onChange={(e) => handleCellChange(rowIndex, col.id, null, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                          className="bg-input/50 border-border/50 text-right h-8 text-sm" dir="rtl"
                        />
                      )}
                    </td>
                  )
                ))}
                <td className="px-2 py-1">
                  <button type="button" onClick={() => handleDeleteRow(rowIndex)} className="p-1 text-muted-foreground hover:text-accent transition-colors rounded" title="حذف الصف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {currentRows.length === 0 && currentColumns.length > 0 && (
              <tr><td colSpan={currentColumns.length + 2} className="px-3 py-4 text-center text-muted-foreground">لا توجد صفوف - اضغط على "إضافة صف" للبدء</td></tr>
            )}
            {currentRows.length === 0 && currentColumns.length === 0 && (
              <tr><td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">لإنشاء جدول، يرجى إضافة الأعمدة أولاً من زر "إدارة الأعمدة" (للأدمن فقط).</td></tr>
            )}
          </tbody>
        </Table>
      </div>
      
      {currentColumns.length > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={handleAddRow} className="w-full" title="إضافة صف جديد">
          <Plus className="w-4 h-4 ml-2" /> إضافة صف
        </Button>
      )}
      
      {error && <p className="text-xs text-accent">{error}</p>}

      {isAdmin && (
        <Dialog open={showColumnEditDialog} onOpenChange={setShowColumnEditDialog}>
          <DialogContent className="max-w-md" dir="rtl" onKeyDown={(e) => { if (e.key === 'Escape') setShowColumnEditDialog(false); }}>
            <DialogHeader><DialogTitle>إدارة أعمدة الجدول</DialogTitle></DialogHeader>
            <form className="space-y-4 py-4" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); if (newColumnName.trim()) handleAddColumn(); }}>
              {currentColumns.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">الأعمدة الحالية (اضغط على الاسم لتعديله):</Label>
                  {currentColumns.map(col => (
                    <div key={col.id} className="space-y-1.5">
                      <div className="flex items-center gap-2 p-2 bg-secondary/10 rounded-lg border border-border/30">
                        {editingColumnId === col.id ? (
                          <Input autoFocus value={editingColumnName} onChange={(e) => setEditingColumnName(e.target.value)} onBlur={() => handleRenameColumn(col.id, editingColumnName)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleRenameColumn(col.id, editingColumnName); } if (e.key === 'Escape') { e.stopPropagation(); setEditingColumnId(null); setEditingColumnName(''); } }} className="flex-1 h-8 text-sm bg-background" dir="rtl" />
                        ) : (
                          <button type="button" onClick={() => { setEditingColumnId(col.id); setEditingColumnName(col.name); }} className="flex-1 text-right text-sm font-medium text-foreground hover:text-primary transition-colors min-w-0 truncate">{col.name}</button>
                        )}
                        <Badge variant="secondary" className="text-xs flex-shrink-0">{col.type === 'text' ? 'نص' : col.type === 'number' ? 'رقم' : col.type === 'date' ? 'تاريخ' : 'مركب'}</Badge>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => handleDeleteColumn(col.id)}><X className="w-3 h-3" /></Button>
                      </div>
                      {col.type === 'compound' && col.subColumns && col.subColumns.length > 0 && (
                        <div className="mr-4 space-y-1">
                          {col.subColumns.map(subCol => {
                            const subKey = `${col.id}-${subCol.id}`;
                            const isEditingSub = editingSubColumnKey === subKey;
                            return (
                              <div key={subCol.id} className="flex items-center gap-2 py-1 pr-2 pl-3 bg-secondary/5 rounded border border-border/20">
                                {isEditingSub ? (
                                  <Input autoFocus value={editingSubColumnName} onChange={(e) => setEditingSubColumnName(e.target.value)} onBlur={() => handleRenameSubColumn(col.id, subCol.id, editingSubColumnName)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleRenameSubColumn(col.id, subCol.id, editingSubColumnName); } if (e.key === 'Escape') { e.stopPropagation(); setEditingSubColumnKey(null); setEditingSubColumnName(''); } }} className="flex-1 h-7 text-xs bg-background" dir="rtl" />
                                ) : (
                                  <button type="button" onClick={() => { setEditingSubColumnKey(subKey); setEditingSubColumnName(subCol.name); }} className="flex-1 text-right text-xs text-muted-foreground hover:text-foreground transition-colors min-w-0 truncate">{subCol.name}</button>
                                )}
                                <Badge variant="outline" className="text-[10px] flex-shrink-0">{subCol.type === 'text' ? 'نص' : subCol.type === 'number' ? 'رقم' : 'تاريخ'}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2 pt-2 border-t border-border/30">
                <Label className="text-sm text-muted-foreground">إضافة عمود جديد:</Label>
                <Input value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="اسم العمود الجديد (مثال: الصادر) - Enter للإضافة" className="bg-input/50 border-border/50 text-right" dir="rtl" maxLength={50} />
                <div className="flex gap-2 mt-2">
                  {(['text', 'number', 'date', 'compound'] as const).map(type => (
                    <Button key={type} type="button" onClick={() => setNewColumnType(type)} className={`px-3 py-2 rounded-lg border text-xs transition-all flex-1 ${newColumnType === type ? 'border-primary bg-primary/20 text-primary' : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}>
                      {type === 'text' ? 'نص' : type === 'number' ? 'رقم' : type === 'date' ? 'تاريخ' : 'مركب'}
                    </Button>
                  ))}
                </div>
                {newColumnType === 'compound' && (
                  <div className="space-y-3 mt-4 p-3 bg-secondary/10 rounded-lg border border-border/30">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1"><Columns className="w-3 h-3" /> أعمدة فرعية للعمود المركب:</Label>
                    {newColumnSubColumns.length > 0 && (
                      <div className="space-y-2">
                        {newColumnSubColumns.map(subCol => (
                          <div key={subCol.id} className="flex items-center justify-between p-2 bg-secondary/20 rounded-lg border border-border/30">
                            <span className="text-sm text-foreground font-medium">{subCol.name}</span>
                            <Badge variant="secondary" className="text-xs">{subCol.type === 'text' ? 'نص' : subCol.type === 'number' ? 'رقم' : 'تاريخ'}</Badge>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSubColumn(subCol.id)}><X className="w-3 h-3" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">اسم العمود الفرعي</Label>
                        <Input value={newSubColumnName} onChange={(e) => setNewSubColumnName(e.target.value)} placeholder="مثال: الكمية" className="bg-input/50 border-border/50 text-right" dir="rtl" maxLength={30} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">النوع</Label>
                        <div className="flex gap-1">
                          {(['text', 'number', 'date'] as const).map(type => (
                            <Button key={type} type="button" onClick={() => setNewSubColumnType(type)} className={`px-3 py-2 rounded-lg border text-xs transition-all flex-1 ${newSubColumnType === type ? 'border-primary bg-primary/20 text-primary' : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}>
                              {type === 'text' ? 'نص' : type === 'number' ? 'رقم' : 'تاريخ'}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="icon" onClick={() => handleAddSubColumn()} disabled={!newSubColumnName.trim()}><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
                {newColumnType !== 'compound' && (
                  <div className="space-y-2 mt-3">
                    <Label className="text-sm text-muted-foreground">خيارات العمود (اختياري - افصل بفاصلة)</Label>
                    <Input value={newColumnOptions} onChange={(e) => setNewColumnOptions(e.target.value)} placeholder="مثال: وارد, صادر, محفوظ" className="bg-input/50 border-border/50 text-right" dir="rtl" />
                    <p className="text-xs text-muted-foreground">عند إدخال خيارات، ستظهر الخلايا كقائمة اختيار (Dropdown) بدل حقل كتابة عادي.</p>
                  </div>
                )}
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setShowColumnEditDialog(false)}>إلغاء</Button>
                <Button type="submit" disabled={!newColumnName.trim() || (newColumnType === 'compound' && newColumnSubColumns.length === 0)}><Plus className="w-4 h-4 ml-2" /> إضافة عمود</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};