import ExcelJS from 'exceljs';

/**
 * Read an Excel file and return rows as string arrays (header + data).
 * Replaces the vulnerable `xlsx` (SheetJS) package.
 */
export async function readExcelFile(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const values = row.values as (string | number | null | undefined)[];
    // ExcelJS row.values is 1-indexed (index 0 is undefined), so slice(1)
    rows.push(values.slice(1).map(v => (v != null ? String(v) : '')));
  });
  return rows;
}

/**
 * Write rows (array of arrays) to an Excel file and trigger download.
 */
export async function writeExcelFile(rows: (string | number)[][], sheetName: string, fileName: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  rows.forEach(row => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
