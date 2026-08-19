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

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "F5EFD9" } } as const;
const HEADER_FONT = { bold: true, color: { argb: "1A1A1A" } } as const;
const TITLE_FONT = { bold: true, size: 14, color: { argb: "1A1A1A" } } as const;

function sheetHeader(ws: ExcelJS.Worksheet, headers: string[]) {
  ws.addRow(headers);
  ws.getRow(1).eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle" };
    cell.border = {
      bottom: { style: "medium", color: { argb: "B8860B" } },
    };
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
}

function fitColumns(ws: ExcelJS.Worksheet, widths: number[]) {
  ws.columns = widths.map((width) => ({ width }));
}

function percentCell(ws: ExcelJS.Worksheet, row: number, col: number, fraction: number | null) {
  const cell = ws.getCell(row, col);
  if (fraction === null) {
    cell.value = "";
  } else {
    cell.value = fraction;
    cell.numFmt = "0.00%";
  }
  return cell;
}

function sanitizeName(s: string) {
  return s.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
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

function addSummarySheet(
  wb: ExcelJS.Workbook,
  ctx: ExcelContext,
  assessments: ExcelAssessment[]
) {
  const ws = wb.addWorksheet("Summary");
  ws.getCell("A1").value = "NUSkor - Section Marks Export";
  ws.getCell("A1").font = TITLE_FONT;
  ws.mergeCells("A1:B1");
  ws.getCell("A3").value = "Course";
  ws.getCell("A4").value = "Course Code";
  ws.getCell("A5").value = "Section";
  ws.getCell("A6").value = "Number of Students";
  ws.getCell("A7").value = "Number of Assessments";
  ws.getCell("A8").value = "Generated Date";
  for (let r = 3; r <= 8; r++) ws.getCell(r, 1).font = { bold: true };
  ws.getCell("B3").value = ctx.courseTitle;
  ws.getCell("B4").value = ctx.courseCode;
  ws.getCell("B5").value = ctx.sectionCode;
  ws.getCell("B6").value = ctx.students.length;
  ws.getCell("B7").value = assessments.length;
  ws.getCell("B8").value = new Date();
  ws.getCell("B8").numFmt = "yyyy-mm-dd hh:mm";
  fitColumns(ws, [22, 60]);
}

export function exportOneAssessment(
  ctx: ExcelContext,
  assessment: ExcelAssessment,
  filename: string
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sanitizeName(assessment.title).slice(0, 28) || "Assessment");

  sheetHeader(ws, [
    "Registration Number",
    "Student Name",
    "Assessment",
    "Obtained Marks",
    "Maximum Marks",
    "Percentage",
    "Weightage",
    "Weighted Marks",
  ]);
  fitColumns(ws, [20, 26, 26, 14, 14, 14, 12, 15]);

  ctx.students.forEach((st, i) => {
    const row = i + 2;
    const obtained = ctx.marksByStudent.get(st.id)?.get(assessment.id) ?? null;
    const fraction = obtained === null ? null : obtained / assessment.total_marks;
    const weighted = fraction === null ? null : fraction * assessment.weightage;
    ws.getCell(row, 1).value = st.registration_no ?? "";
    ws.getCell(row, 2).value = st.full_name ?? "";
    ws.getCell(row, 3).value = assessment.title;
    ws.getCell(row, 4).value = obtained;
    ws.getCell(row, 5).value = assessment.total_marks;
    percentCell(ws, row, 6, fraction);
    ws.getCell(row, 7).value = assessment.weightage;
    ws.getCell(row, 7).numFmt = "0.0";
    const w = ws.getCell(row, 8);
    if (weighted !== null) {
      w.value = weighted;
      w.numFmt = "0.00";
    }
  });

  download(wb, filename);
}

export function exportAllAssessments(
  ctx: ExcelContext,
  assessments: ExcelAssessment[],
  filename: string
) {
  const wb = new ExcelJS.Workbook();
  addSummarySheet(wb, ctx, assessments);

  const chunks: ExcelAssessment[][] = [];
  for (let i = 0; i < assessments.length; i += 6) {
    chunks.push(assessments.slice(i, i + 6));
  }
  if (chunks.length === 0) chunks.push([]);

  chunks.forEach((chunk, ci) => {
    const ws = wb.addWorksheet(chunks.length === 1 ? "All Marks" : `All Marks ${ci + 1}`);
    const headers = ["Registration Number", "Student Name"];
    chunk.forEach((a) => {
      headers.push(
        a.title,
        `${a.title} Total`,
        `${a.title} %`,
        `${a.title} Weight`,
        `${a.title} Weighted`
      );
    });
    sheetHeader(ws, headers);
    fitColumns(ws, [
      20,
      26,
      ...chunk.flatMap(() => [26, 14, 14, 12, 15]),
    ]);

    ctx.students.forEach((st, i) => {
      const row = i + 2;
      ws.getCell(row, 1).value = st.registration_no ?? "";
      ws.getCell(row, 2).value = st.full_name ?? "";
      const marks = ctx.marksByStudent.get(st.id) ?? new Map<string, number | null>();
      chunk.forEach((a, ai) => {
        const base = 3 + ai * 5;
        const obtained = marks.get(a.id) ?? null;
        const fraction = obtained === null ? null : obtained / a.total_marks;
        const weighted = fraction === null ? null : fraction * a.weightage;
        ws.getCell(row, base).value = obtained;
        ws.getCell(row, base + 1).value = a.total_marks;
        percentCell(ws, row, base + 2, fraction);
        ws.getCell(row, base + 3).value = a.weightage;
        ws.getCell(row, base + 3).numFmt = "0.0";
        const w = ws.getCell(row, base + 4);
        if (weighted !== null) {
          w.value = weighted;
          w.numFmt = "0.00";
        }
      });
    });
  });

  const details = wb.addWorksheet("Assessment Details");
  sheetHeader(details, [
    "Assessment",
    "Type",
    "Maximum Marks",
    "Weightage",
    "Status",
    "Release Date",
  ]);
  fitColumns(details, [30, 14, 14, 12, 12, 14]);
  assessments.forEach((a, i) => {
    const row = i + 2;
    details.getCell(row, 1).value = a.title;
    details.getCell(row, 2).value = a.type;
    details.getCell(row, 3).value = a.total_marks;
    details.getCell(row, 4).value = a.weightage;
    details.getCell(row, 4).numFmt = "0.0";
    details.getCell(row, 5).value = a.status;
    details.getCell(row, 6).value = a.release_date ?? "";
  });

  download(wb, filename);
}

export { sanitizeName, download };