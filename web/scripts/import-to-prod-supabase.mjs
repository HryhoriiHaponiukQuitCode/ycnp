import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORT_DIR = path.resolve(__dirname, "..", "supabase-export");

const supabaseUrl = process.env.PROD_SUPABASE_URL || process.env.PROD_NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing PROD_NEXT_PUBLIC_SUPABASE_URL/PROD_SUPABASE_URL or PROD_SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const importPlan = [
  { table: "organizations", file: "organizations.json", conflict: "id" },
  { table: "user_roles", file: "user_roles.json", conflict: "id" },
  { table: "fiscal_years", file: "fiscal_years.json", conflict: "id" },
  { table: "user_role_fiscal_years", file: "user_role_fiscal_years.json", conflict: "id" },
  { table: "donors", file: "donors.json", conflict: "id" },
  { table: "donor_scores", file: "donor_scores.json", conflict: "id" },
  { table: "donations", file: "donations.json", conflict: "id" },
  { table: "donor_assignments", file: "donor_assignments.json", conflict: "id" },
  { table: "move_ideas", file: "move_ideas.json", conflict: "id" },
  { table: "moves", file: "moves.json", conflict: "id" },
  { table: "donor_tags", file: "donor_tags.json", conflict: "id" },
  { table: "donor_tag_assignments", file: "donor_tag_assignments.json", conflict: "donor_id,tag_id" },
  { table: "donor_research", file: "donor_research.json", conflict: "id" },
  { table: "meeting_notes", file: "meeting_notes.json", conflict: "id" },
  { table: "org_invites", file: "org_invites.json", conflict: "id" },
];

function readJson(filename) {
  const filePath = path.join(EXPORT_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function upsertInChunks(table, rows, onConflict) {
  if (!rows.length) {
    console.log(`${table}: no rows to import`);
    return;
  }

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from(table)
      .upsert(slice, { onConflict, ignoreDuplicates: false });

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    console.log(`${table}: imported ${Math.min(i + slice.length, rows.length)}/${rows.length}`);
  }
}

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return count;
}

async function main() {
  const results = [];

  for (const step of importPlan) {
    const rows = readJson(step.file);
    await upsertInChunks(step.table, rows, step.conflict);
    const count = await countRows(step.table);
    results.push({ table: step.table, importedRows: rows.length, targetCount: count });
  }

  fs.writeFileSync(
    path.join(EXPORT_DIR, "prod-import-results.json"),
    JSON.stringify({ imported_at: new Date().toISOString(), results }, null, 2) + "\n",
    "utf8"
  );

  console.log("Import complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
