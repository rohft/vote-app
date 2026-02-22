import { ColumnConfig } from '@/types';

/**
 * Given Excel header row and app column configs,
 * returns a mapping: excel column index -> voter field key.
 * Uses fuzzy matching on both Nepali and English labels.
 */
export function matchExcelHeaders(
  excelHeaders: string[],
  columnConfigs: ColumnConfig[]
): Record<number, string> {
  const mapping: Record<number, string> = {};
  const usedKeys = new Set<string>();

  for (let i = 0; i < excelHeaders.length; i++) {
    const header = excelHeaders[i].trim().toLowerCase();
    if (!header) continue;

    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const col of columnConfigs) {
      if (usedKeys.has(col.key)) continue;
      const neLabel = col.labelNe.toLowerCase();
      const enLabel = col.labelEn.toLowerCase();
      const key = col.key.toLowerCase();

      // Exact match
      if (header === neLabel || header === enLabel || header === key) {
        bestMatch = col.key;
        bestScore = 100;
        break;
      }

      // Contains match
      if (header.includes(neLabel) || neLabel.includes(header) ||
          header.includes(enLabel) || enLabel.includes(header)) {
        const score = 80;
        if (score > bestScore) {
          bestMatch = col.key;
          bestScore = score;
        }
      }
    }

    if (bestMatch && bestScore >= 80) {
      mapping[i] = bestMatch;
      usedKeys.add(bestMatch);
    }
  }

  return mapping;
}

/**
 * Parse a row of Excel data into a Voter object using the header mapping.
 */
export function parseVoterRow(
  row: string[],
  headerMapping: Record<number, string>,
  rowIndex: number,
  wardIdx: number,
  boothIdx: number
): Record<string, string | number> {
  const voter: Record<string, string | number> = {
    id: `v-w${wardIdx}-b${boothIdx}-${rowIndex}`,
  };

  for (const [colIdxStr, key] of Object.entries(headerMapping)) {
    const colIdx = Number(colIdxStr);
    const val = row[colIdx] || '';
    if (key === 'voterSerialNo' || key === 'age') {
      voter[key] = Number(val) || (key === 'voterSerialNo' ? rowIndex + 1 : 0);
    } else {
      voter[key] = String(val);
    }
  }

  // Fill defaults for missing required fields
  const defaults: Record<string, string | number> = {
    voterSerialNo: rowIndex + 1, name: '', surname: '', voterIdNo: '',
    gender: '', age: 0, spouseName: '', parentsName: '', caste: '',
    ethnicity: '', mobileNumber: '', email: '', occupation: '',
    locality: '', party: '', status: '', family: '', note: '',
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (!(k in voter)) voter[k] = v;
  }

  return voter;
}
