import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORT_DIR = path.resolve(__dirname, "..", "supabase-export");
const OUTPUT_FILE = path.join(EXPORT_DIR, "data-import-fixed.sql");

const importPlan = [
  { table: "organizations", file: "organizations.json" },
  { table: "super_admins", file: "super_admins.json" },
  { table: "org_members", file: "org_members.json" },
  { table: "fiscal_years", file: "fiscal_years.json" },
  { table: "solicitors", file: "solicitors.json" },
  { table: "solicitor_fiscal_years", file: "solicitor_fiscal_years.json" },
  { table: "donors", file: "donors.json" },
  { table: "donor_scores", file: "donor_scores.json" },
  { table: "donations", file: "donations.json" },
  { table: "move_ideas", file: "move_ideas.json" },
  { table: "moves", file: "moves.json" },
  { table: "donor_tags", file: "donor_tags.json" },
  { table: "donor_tag_assignments", file: "donor_tag_assignments.json" },
  { table: "donor_research", file: "donor_research.json" },
  { table: "meeting_notes", file: "meeting_notes.json" },
  { table: "org_invites", file: "org_invites.json" },
  { table: "donor_solicitor_assignments", file: "donor_solicitor_assignments.json" },
];

function readJson(filename) {
  const fullPath = path.join(EXPORT_DIR, filename);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function escapeString(value) {
  return value.replace(/'/g, "''");
}

const COLUMN_TYPE_OVERRIDES = {
  organizations: {
    settings: "jsonb",
  },
  donor_research: {
    content: "jsonb",
  },
  meeting_notes: {
    follow_ups: "text[]",
    key_outcomes: "text[]",
    structured_notes: "jsonb",
  },
  move_ideas: {
    methods: "text[]",
    purpose: "text[]",
    types: "text[]",
  },
};

function toTextArrayLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (!Array.isArray(value)) {
    throw new Error(`Expected array value, got ${typeof value}`);
  }

  const items = value
    .map((item) => {
      if (item === null || item === undefined) return "NULL";
      return `'${escapeString(String(item))}'`;
    })
    .join(", ");

  return `array[${items}]::text[]`;
}

function toJsonbLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${escapeString(JSON.stringify(value))}'::jsonb`;
}

function toSqlLiteral(value, columnType) {
  if (value === null || value === undefined) return "NULL";
  if (columnType === "text[]") return toTextArrayLiteral(value);
  if (columnType === "jsonb") return toJsonbLiteral(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "object") return toJsonbLiteral(value);
  return `'${escapeString(String(value))}'`;
}

function buildInsert(table, rows) {
  if (!rows.length) return `-- ${table}: no rows\n`;

  const columns = Object.keys(rows[0]);
  const columnTypeOverrides = COLUMN_TYPE_OVERRIDES[table] || {};
  const header = `insert into public.${table} (${columns.map((c) => `"${c}"`).join(", ")}) values\n`;

  const values = rows.map((row) => {
    const tuple = columns
      .map((column) => toSqlLiteral(row[column], columnTypeOverrides[column]))
      .join(", ");
    return `  (${tuple})`;
  }).join(",\n");

  return `${header}${values}\non conflict do nothing;\n`;
}

function main() {
  const chunks = [
    "begin;",
    "set session_replication_role = replica;",
    "",
  ];

  for (const step of importPlan) {
    const rows = readJson(step.file);
    chunks.push(`-- ${step.table}`);
    chunks.push(buildInsert(step.table, rows));
    chunks.push("");
  }

  chunks.push("set session_replication_role = default;");
  chunks.push("commit;");
  chunks.push("");

  fs.writeFileSync(OUTPUT_FILE, chunks.join("\n"), "utf8");
  console.log(`Generated ${OUTPUT_FILE}`);
}

main();
