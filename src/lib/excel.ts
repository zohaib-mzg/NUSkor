import ExcelJS from "exceljs";
import { cleanName } from "./utils";

export interface ExcelStudent {
  id: string;
  registration_no: string | null;
  full_name: string | null;
}

export interface ExcelAssessment {
  id: string;
  title: string;
  type: string;
  total_marks: number;
  weightage: number;
  status: string;
  release_date: string | null;
  created_at: string;
}

export interface ExcelContext {
  courseCode: string;
  courseTitle: string;
  sectionCode: string;
  students: ExcelStudent[];
  marksByStudent: Map<string, Map<string, number | null>>;
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "F5EFD9" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "1A1A1A" },
};

function applyCellBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "D0D0D0" } },
    bottom: { style: "thin", color: { argb: "D0D0D0" } },
    left: { style: "thin", color: { argb: "D0D0D0" } },
    right: { style: "thin", color: { argb: "D0D0D0" } },
  };
}

function download(workbook: ExcelJS.Workbook, filename: string) {
  workbook.xlsx.writeBuffer().then((buf) => {
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}

/**
 * Marks-sheet format:
 *   Rows 1–2: empty
 *   Row 3:    Sr. No. | Roll No | Name | A01 (20) | Q01 (10) | …
 *   Row 4+:   student data (only obtained marks)
 */
export function exportMarksSheet(
  ctx: ExcelContext,
  assessments: ExcelAssessment[],
  filename: string
) {
  if (assessments.length === 0) return;

  // Sort students by normalised registration number (ascending).
  // Strip non-digits so "24L-2502" → "242502"; "N/A" → "" → pushed to end.
  const students = [...ctx.students].sort((a, b) => {
    const na = (a.registration_no ?? "").replace(/\D/g, "");
    const nb = (b.registration_no ?? "").replace(/\D/g, "");
    if (!na && !nb) return 0;
    if (!na) return 1;
    if (!nb) return -1;
    return na.localeCompare(nb, undefined, { numeric: true });
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Marks");

  // Column layout: A = Sr. No., B = Roll No, C = Name, D… = assessments
  const TOTAL_COLS = 3 + assessments.length;

  // ── Rows 1 & 2: empty ──

  // ── Row 3: header row ──
  const r3 = ws.getRow(3);
  const headers = ["Sr. No.", "Roll No", "Name"];
  headers.forEach((h, i) => {
    const cell = r3.getCell(i + 1);
    cell.value = h;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    applyCellBorder(cell);
  });

  // Assessment columns: "A01 (20)" format
  assessments.forEach((a, i) => {
    const cell = r3.getCell(4 + i);
    cell.value = `${a.title} (${a.total_marks})`;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    applyCellBorder(cell);
  });
  r3.height = 22;

  // ── Column widths ──
  const colWidths: number[] = [
    8,    // Sr. No.
    16,   // Roll No
    28,   // Name
    ...assessments.map(() => 12),
  ];
  ws.columns = colWidths.map((w) => ({ width: w }));

  // ── Freeze row 3 ──
  ws.views = [{ state: "frozen", ySplit: 3 }];

  // ── Student data (row 4+) ──
  students.forEach((st, idx) => {
    const rowNum = 4 + idx;
    const row = ws.getRow(rowNum);

    // Sr. No.
    const c1 = row.getCell(1);
    c1.value = idx + 1;
    c1.alignment = { horizontal: "center" };
    applyCellBorder(c1);

    // Roll No
    const c2 = row.getCell(2);
    c2.value = st.registration_no ?? "";
    c2.alignment = { horizontal: "center" };
    applyCellBorder(c2);

    // Name (cleaned)
    const c3 = row.getCell(3);
    c3.value = cleanName(st.full_name);
    c3.alignment = { horizontal: "left", vertical: "middle" };
    applyCellBorder(c3);

    // Per-assessment obtained marks only
    const studentMarks = ctx.marksByStudent.get(st.id) ?? new Map<string, number | null>();
    assessments.forEach((a, i) => {
      const val = studentMarks.get(a.id) ?? null;
      const cell = row.getCell(4 + i);
      cell.value = val;
      cell.alignment = { horizontal: "center" };
      cell.numFmt = "0.##";
      applyCellBorder(cell);
    });
  });

  // ── Auto-filter on row 3 ──
  if (students.length > 0) {
    ws.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3, column: TOTAL_COLS },
    };
  }

  download(wb, filename);
}

export function exportOneAssessment(
  ctx: ExcelContext,
  assessment: ExcelAssessment,
  filename: string
) {
  exportMarksSheet(ctx, [assessment], filename);
}

export function exportAllAssessments(
  ctx: ExcelContext,
  assessments: ExcelAssessment[],
  filename: string
) {
  exportMarksSheet(ctx, assessments, filename);
}
