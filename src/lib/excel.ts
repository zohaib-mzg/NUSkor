import ExcelJS from "exceljs";

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
const ASSESSMENT_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 11,
  color: { argb: "1A1A1A" },
};

function sanitizeName(s: string) {
  return s.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
}

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
 * New marks-sheet format:
 *   Rows 1–2: empty
 *   Row 3:    assessment codes/names (above their columns)
 *   Row 4:    Sr. No. | Roll No | Name | Total Marks | [max marks per assessment] …
 *   Row 5+:   student data
 */
export function exportMarksSheet(
  ctx: ExcelContext,
  assessments: ExcelAssessment[],
  filename: string
) {
  if (assessments.length === 0) return;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Marks");

  // ── Column layout ──
  // A = Sr. No., B = Roll No, C = Name, D = Total Marks, E… = assessments
  const TOTAL_COLS = 4 + assessments.length;

  // ── Row 1 & 2: empty (leave blank) ──

  // ── Row 3: assessment names ──
  const r3 = ws.getRow(3);
  // cells A–D on row 3 stay empty
  assessments.forEach((a, i) => {
    const cell = r3.getCell(5 + i);
    cell.value = a.title;
    cell.font = ASSESSMENT_FONT;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    applyCellBorder(cell);
  });
  r3.height = 22;

  // ── Row 4: column headers + max marks ──
  const r4 = ws.getRow(4);
  const headers = ["Sr. No.", "Roll No", "Name", "Total Marks"];
  headers.forEach((h, i) => {
    const cell = r4.getCell(i + 1);
    cell.value = h;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    applyCellBorder(cell);
  });

  // For each assessment column, show max marks
  assessments.forEach((a, i) => {
    const cell = r4.getCell(5 + i);
    cell.value = a.total_marks;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.numFmt = "0.##";
    applyCellBorder(cell);
  });
  r4.height = 20;

  // ── Column widths ──
  const colWidths: number[] = [
    8,    // Sr. No.
    16,   // Roll No
    28,   // Name
    12,   // Total Marks
    ...assessments.map(() => 12),
  ];
  ws.columns = colWidths.map((w) => ({ width: w }));

  // ── Freeze: freeze rows 3–4 so headers stay visible when scrolling ──
  ws.views = [{ state: "frozen", ySplit: 4 }];

  // ── Student data (row 5+) ──
  ctx.students.forEach((st, idx) => {
    const rowNum = 5 + idx;
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

    // Name
    const c3 = row.getCell(3);
    c3.value = st.full_name ?? "";
    c3.alignment = { horizontal: "left", vertical: "middle" };
    applyCellBorder(c3);

    // Total Marks (sum of obtained across selected assessments)
    const studentMarks = ctx.marksByStudent.get(st.id) ?? new Map<string, number | null>();
    let totalObtained = 0;
    let hasAny = false;
    assessments.forEach((a) => {
      const val = studentMarks.get(a.id) ?? null;
      if (val !== null) {
        totalObtained += val;
        hasAny = true;
      }
    });
    const c4 = row.getCell(4);
    c4.value = hasAny ? totalObtained : "";
    c4.alignment = { horizontal: "center" };
    c4.numFmt = "0.##";
    applyCellBorder(c4);

    // Per-assessment obtained marks
    assessments.forEach((a, i) => {
      const val = studentMarks.get(a.id) ?? null;
      const cell = row.getCell(5 + i);
      cell.value = val;
      cell.alignment = { horizontal: "center" };
      cell.numFmt = "0.##";
      applyCellBorder(cell);
    });
  });

  // ── Auto-filter on row 4 ──
  if (ctx.students.length > 0) {
    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: TOTAL_COLS },
    };
  }

  download(wb, filename);
}

/**
 * Single-assessment export (kept for backward compat / quick export).
 * Uses the same marks-sheet layout but with only one assessment column.
 */
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

export { sanitizeName, download };
