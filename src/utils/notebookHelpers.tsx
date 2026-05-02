import React from 'react';
import { 
  Type, Hash, AlignLeft, Image as ImageIcon, 
  ListChecks, Calendar, Table, CalendarDays 
} from 'lucide-react';
import type { Notebook, NotebookEntry, FieldType, FlexibleTableValue } from '@/types/notebook';
import logo from '@/assets/logo.png';

// 1. خريطة الأيقونات
export const FIELD_TYPE_ICONS: Record<FieldType, React.ElementType> = {
  text: Type, number: Hash, textarea: AlignLeft, image: ImageIcon, choice: ListChecks, date: Calendar,
  compound: Type, yearlyBatches: Calendar, selectableBatches: ListChecks, quarterlyInvestigations: Calendar,
  customTable: Table, flexibleTable: Table, monthlyData: CalendarDays,
};

// 2. المعالج الذكي للبيانات
export const flattenCellData = (cell: unknown): string => {
  if (cell === null || cell === undefined) return '';
  if (typeof cell !== 'object') return String(cell).trim();
  
  let currentWord = '';
  const parts: string[] = [];
  
  const keys = Object.keys(cell as Record<string, unknown>).sort();
  for (const key of keys) {
    const val = (cell as Record<string, unknown>)[key];
    if (val === null || val === undefined || String(val).trim() === '') continue;
    
    const strVal = String(val).trim();
    if (!isNaN(Number(key)) && strVal.length === 1) {
      currentWord += strVal;
    } else {
      if (currentWord) { parts.push(currentWord); currentWord = ''; }
      parts.push(strVal);
    }
  }
  if (currentWord) parts.push(currentWord);
  return parts.join(' / ');
};

// 3. قالب الطباعة الضخم (عزلناه هنا عشان ننضف الكومبوننت)
export const buildPrintableHtml = (entry: NotebookEntry, notebook: Notebook): string => {
  if (!notebook) return '';
  const entryData = entry.data || {};

  const getFieldValue = (keywords: string[]) => {
    const field = notebook.fields.find(f => keywords.some(k => f.name.includes(k)));
    if (!field) return '';
    return flattenCellData(entryData[field.id]);
  };

  const getPhotoUrl = () => {
    const field = notebook.fields.find(f => f.type === 'image');
    return field && typeof entryData[field.id] === 'string' ? entryData[field.id] : '';
  };

  const photo         = getPhotoUrl();
  const rank          = getFieldValue(['الرتبة', 'رتبة']);
  const name          = getFieldValue(['الاسم', 'اسم']);
  const entity        = getFieldValue(['الجهة', 'جهة']);
  const recruitDate   = getFieldValue(['تاريخ التجنيد', 'تاريخ الضم']);
  const joinEntity    = getFieldValue(['جهة الالتحاق']);
  const radifDate     = getFieldValue(['تاريخ الرديف', 'الرديف']);
  const nationalId    = getFieldValue(['الرقم القومي', 'رقم البطاقة']);
  const policeNum     = getFieldValue(['رقم الشرطة', 'الرقم العسكري']);
  const civilRegistry = getFieldValue(['سجل مدني', 'السجل المدني']);
  const address       = getFieldValue(['محل الاقامة', 'محل الإقامة', 'العنوان', 'محل الاقامة بالتفصيل']);

  const generateInvestigationTables = (keywords: string[]) => {
    const matchedFields = notebook.fields.filter(f => {
      const n = (f.name || '').toLowerCase();
      const s = (f.section || '').toLowerCase();
      const isTable = f.type === 'customTable' || f.type === 'flexibleTable';
      return isTable && keywords.some(k => n.includes(k) || s.includes(k));
    }).sort((a, b) => a.name.localeCompare(b.name)); 

    const totalTables = 3;
    const rowsPerTable = 8;
    let tablesHtml = '';

    for (let t = 0; t < totalTables; t++) {
      let tbodyHtml = '';
      const currentField = matchedFields[t]; 
      let fieldRows: any[] = [];
      let outColId, inColId, resultColId;

      if (currentField) {
        const val = entryData[currentField.id];
        if (val) {
          let cols: any[] = [];
          if (Array.isArray(val)) {
            fieldRows = val;
            cols = currentField.columns || [];
          } else if (typeof val === 'object' && val !== null && 'rows' in val) {
            fieldRows = (val as FlexibleTableValue).rows || [];
            cols = (val as FlexibleTableValue).columns || [];
          }

          outColId = cols.find((c: any) => c.name?.includes('صادر'))?.id || cols[0]?.id;
          inColId = cols.find((c: any) => c.name?.includes('وارد'))?.id || cols[1]?.id;
          resultColId = cols.find((c: any) => c.name?.includes('نتيجة') || c.name?.includes('نتيجه'))?.id || cols[2]?.id;
        }
      }

      for (let r = 0; r < rowsPerTable; r++) {
        const rowData = fieldRows[r]; 
        const outVal    = rowData ? flattenCellData(rowData[outColId || '']) : '&nbsp;';
        const inVal     = rowData ? flattenCellData(rowData[inColId || '']) : '&nbsp;';
        const resultVal = rowData ? flattenCellData(rowData[resultColId || '']) : '&nbsp;';

        tbodyHtml += `
          <tr>
            <td>${outVal || '&nbsp;'}</td>
            <td>${inVal || '&nbsp;'}</td>
            <td>${resultVal || '&nbsp;'}</td>
          </tr>
        `;
      }

      const tableTitle = currentField ? currentField.name : '&nbsp;';

      tablesHtml += `
        <div style="flex: 1;">
          <div style="text-align: center; font-weight: bold; margin-bottom: 5px; font-size: 14px; color: #333;">${tableTitle}</div>
          <table class="inv-table" style="width: 100%;">
            <thead><tr><th>الصادر</th><th>الوارد</th><th>النتيجة</th></tr></thead>
            <tbody>${tbodyHtml}</tbody>
          </table>
        </div>
      `;
    }
    return tablesHtml;
  };

  return `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>استمارة نتيجة التحري</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-border { border: 4px double #000; padding: 15px; min-height: 95vh; }
          .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
          .header-right { text-align: center; font-weight: bold; font-size: 16px; line-height: 1.4; }
          .header-center { text-align: center; margin-top: 30px; }
          .main-title { background-color: #e0e0e0; border: 2px solid #000; padding: 10px 40px; font-size: 20px; font-weight: bold; display: inline-block; box-shadow: 2px 2px 0px #000; }
          .header-left .logo { width: 100px; height: 100px; }
          .info-wrapper { display: flex; align-items: stretch; margin-bottom: 20px; }
          .photo-box { width: 120px; border: 2px solid #000; margin-left: 15px; display: flex; align-items: center; justify-content: center; background: #f9f9f9; }
          .photo-box img { width: 100%; height: 100%; object-fit: cover; }
          .info-table { flex: 1; border-collapse: collapse; border: 2px solid #000; }
          .info-table td { border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; font-size: 14px; }
          .info-table .bg-gray { background-color: #e0e0e0; width: 15%; }
          .section-title-wrapper { text-align: center; margin: 15px 0; }
          .section-title { background-color: #666; color: #fff; display: inline-block; padding: 5px 60px; font-size: 18px; font-weight: bold; border-radius: 10px; }
          .tables-container { display: flex; gap: 10px; margin-bottom: 20px; }
          .inv-table { border-collapse: collapse; border: 2px solid #000; width: 100%; }
          .inv-table th { background-color: #e0e0e0; border: 1px solid #000; padding: 5px; font-size: 12px; }
          .inv-table td { border: 1px solid #000; height: 25px; text-align: center; font-size: 13px; font-weight: bold; }
          .footer-signatures { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 40px; font-size: 16px; font-weight: bold; text-align: center; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="page-border">
          <div class="header-container">
            <div class="header-right">وزارة الداخلية<br>الإدارة العامة للأمن المركزي بالإسكندرية<br>قطاع الشهيد باسم عادل<br>وحدة الأمن والتحريات</div>
            <div class="header-center"><div class="main-title">استمارة نتيجة التحري السياسي والجنائي</div></div>
            <div class="header-left"><div class="logo"><img src="${window.location.origin}${logo}" alt="Logo" style="width:100px;height:100px;object-fit:contain;" /></div></div>
          </div>
          <div class="info-wrapper">
            <table class="info-table">
              <tr><td class="bg-gray">الرتبة</td><td>${rank || '&nbsp;'}</td><td class="bg-gray">الاسم</td><td>${name || '&nbsp;'}</td></tr>
              <tr><td class="bg-gray">الجهة</td><td>${entity || '&nbsp;'}</td><td class="bg-gray">تاريخ التجنيد</td><td>${recruitDate || '&nbsp;'}</td></tr>
              <tr><td class="bg-gray">جهة الالتحاق</td><td>${joinEntity || '&nbsp;'}</td><td class="bg-gray">تاريخ الرديف</td><td>${radifDate || '&nbsp;'}</td></tr>
              <tr><td class="bg-gray">الرقم القومي</td><td>${nationalId || '&nbsp;'}</td><td class="bg-gray">رقم الشرطة</td><td>${policeNum || '&nbsp;'}</td></tr>
              <tr><td class="bg-gray">سجل مدني</td><td>${civilRegistry || '&nbsp;'}</td><td class="bg-gray">محل الاقامة بالتفصيل</td><td>${address || '&nbsp;'}</td></tr>
            </table>
            <div class="photo-box">${photo ? `<img src="${photo}" alt="صورة" />` : 'صورة'}</div>
          </div>
          <div class="section-title-wrapper"><div class="section-title">التحريات السياسية</div></div>
          <div class="tables-container">${generateInvestigationTables(['سياس'])}</div>
          <div class="section-title-wrapper"><div class="section-title">التحريات الجنائية</div></div>
          <div class="tables-container">${generateInvestigationTables(['جنائ'])}</div>
          <div class="footer-signatures">
            <div>ضابط التحريات<br>نقيب /<br><br>فيصل احمد جمال</div>
            <div>رئيس قسم الأمن والتحريات<br>رائد /<br><br>احمد عمران</div>
          </div>
        </div>
      </body>
    </html>
  `;
};