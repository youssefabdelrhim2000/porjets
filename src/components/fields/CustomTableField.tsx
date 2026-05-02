// ============================================
// CustomTableField Component
// Dynamic table with custom columns
// ============================================

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { FieldDefinition } from '@/types/notebook';
import type { CustomTableValue, TableRowValue } from '@/types/form';

interface CustomTableFieldProps {
  field: FieldDefinition;
  value: CustomTableValue;
  onChange: (value: CustomTableValue) => void;
  error?: string;
}

export const CustomTableField: React.FC<CustomTableFieldProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const tableValue = Array.isArray(value) ? value : [];
  const tableColumns = field.columns || [];

  const handleCellChange = (rowIndex: number, columnId: string, cellValue: string) => {
    const newRows = [...tableValue];
    newRows[rowIndex] = { ...newRows[rowIndex], [columnId]: cellValue };
    onChange(newRows);
  };

  const handleAddRow = () => {
    const newRow: TableRowValue = {};
    tableColumns.forEach(col => { newRow[col.id] = ''; });
    onChange([...tableValue, newRow]);
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newRows = tableValue.filter((_, i) => i !== rowIndex);
    onChange(newRows);
  };

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-3 py-2 text-right text-muted-foreground font-medium w-10">#</th>
              {tableColumns.map(col => (
                <th key={col.id} className="px-3 py-2 text-right text-muted-foreground font-medium">
                  {col.name}
                </th>
              ))}
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {tableValue.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-border/30">
                <td className="px-3 py-2 text-muted-foreground text-center">{rowIndex + 1}</td>
                {tableColumns.map(col => (
                  <td key={col.id} className="px-2 py-1">
                    <Input
                      type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                      value={row[col.id] || ''}
                      onChange={(e) => handleCellChange(rowIndex, col.id, e.target.value)}
                      className="bg-input/50 border-border/50 text-right h-8 text-sm"
                      dir="rtl"
                    />
                  </td>
                ))}
                <td className="px-2 py-1">
                  <button
                    type="button"
                    onClick={() => handleDeleteRow(rowIndex)}
                    className="p-1 text-muted-foreground hover:text-accent transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {tableValue.length === 0 && (
              <tr>
                <td colSpan={tableColumns.length + 2} className="px-3 py-4 text-center text-muted-foreground">
                  لا توجد صفوف - اضغط على "إضافة صف" للبدء
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Add Row Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddRow}
        className="w-full"
      >
        <Plus className="w-4 h-4 ml-2" />
        إضافة صف
      </Button>
      
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
};
