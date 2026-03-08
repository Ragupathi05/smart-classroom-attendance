const fs = require("fs");
const XLSX = require("xlsx");

const wb = XLSX.readFile("C:/Users/netha/Documents/CSM/CSM Students List.xlsx");
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

const students = rows
  .filter((r) => r["Roll No"] && r["Name of the Student"])
  .map((r, i) => ({
    id: String(i + 1),
    rollNumber: String(r["Roll No"]).trim(),
    name: String(r["Name of the Student"]).trim(),
    status: "present",
  }));

const out = `import type { Student } from "@/lib/store"\n\nexport const csmStudents: Student[] = ${JSON.stringify(students, null, 2)}\n`;
fs.mkdirSync("lib/data", { recursive: true });
fs.writeFileSync("lib/data/csm-students.ts", out);

console.log(`Wrote ${students.length} students to lib/data/csm-students.ts`);
