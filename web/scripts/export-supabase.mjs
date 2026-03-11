import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORT_DIR = path.resolve(__dirname, "..", "supabase-export");

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tables = [
  "organizations",
  "user_roles",
  "fiscal_years",
  "user_role_fiscal_years",
  "donors",
  "donor_scores",
  "donations",
  "donor_assignments",
  "move_ideas",
  "moves",
  "donor_tags",
  "donor_tag_assignments",
  "donor_research",
  "meeting_notes",
  "org_invites",
];

const tableColumns = {
  organizations: ["created_at","id","logo_url","name","settings","slug","updated_at","website"],
  user_roles: ["created_at","email","full_name","id","invited_by_user_id","is_active","organization_id","phone","role","updated_at","user_id"],
  fiscal_years: ["created_at","end_date","id","is_current","label","organization_id","start_date"],
  user_role_fiscal_years: ["created_at","fiscal_year_id","id","letter_signature","letter_signature_title","title","user_role_id"],
  donors: ["address","ask_date","ask_goal","ask_method","ask_partner","ask_purpose","city","created_at","crm_account_id","crm_account_number","crm_link","donor_interests","email","envelope_name","first_name","formal_name","generosity_score","home_phone","household_name","id","informal_name","last_name","mail_merge_greeting","mobile_phone","moves_needed_override","name","organization_id","previous_solicitor","primary_phone","profile_accuracy","recognition_name","relationship_to_organization","state","updated_at","wealth_capacity","zip_code"],
  donor_scores: ["ask_goal","capacity_score","created_at","donor_fund_foundation","donor_id","fiscal_year_id","five_years_in_row","hunch","id","is_alumni","is_board_member","is_current_donor","is_grandparent","is_parent","is_past_donor","last_year_capacity","last_year_prospect_score","long_term_commitment","major_donation_amount","recent_1000_donation","recent_major_donation","updated_at"],
  donations: ["amount","created_at","description","donated_at","donation_type","donor_id","fiscal_year_id","id","updated_at"],
  donor_assignments: ["created_at","donor_id","fiscal_year_id","id","is_primary","user_role_id"],
  move_ideas: ["created_at","id","is_global","methods","name","notes","organization_id","purpose","types","updated_at"],
  moves: ["assigned_to","completed_at","created_at","donor_id","due_date","id","is_completed","month","move_idea_id","name","notes","organization_id","updated_at"],
  donor_tags: ["color","created_at","id","name","organization_id"],
  donor_tag_assignments: ["donor_id","tag_id"],
  donor_research: ["content","created_at","created_by","donor_id","id","research_type"],
  meeting_notes: ["created_at","created_by","donor_id","follow_ups","id","key_outcomes","meeting_date","move_id","organization_id","raw_notes","structured_notes","updated_at"],
  org_invites: ["accepted_at","created_at","created_by","email","expires_at","id","organization_id","role","token"],
};

const schemaSummary = {
  enums: {
    app_role: ["super_admin", "organization_admin", "organization_solicitor"],
    ask_method_enum: ["In Person", "Phone", "Phone call", "Email", "Text / WhatsApp"],
    donation_type: ["operating", "restricted", "capital", "other"],
    generosity_score_enum: ["Cool", "On Fire!", "Hot", "Cold", "Warm", "Not Scanned"],
    profile_accuracy_enum: ["High", "Low"],
  },
  tables: tableColumns,
  views: ["v_donor_summary", "v_moves_dashboard", "v_solicitor_summary"],
  functions: ["get_user_org_ids", "is_org_admin", "is_org_member"],
};

async function exportTable(table) {
  const columns = tableColumns[table].join(",");
  let allRows = [];
  let from = 0;
  const chunkSize = 1000;

  while (true) {
    const to = from + chunkSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, to);

    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;

    allRows = allRows.concat(data);
    if (data.length < chunkSize) break;
    from += chunkSize;
  }

  return allRows;
}

async function main() {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  const exportPayload = {
    exported_at: new Date().toISOString(),
    source: "supabase",
    schema: "public",
    tables: {},
  };

  for (const table of tables) {
    console.log(`Exporting ${table}...`);
    const rows = await exportTable(table);
    exportPayload.tables[table] = rows;
    fs.writeFileSync(
      path.join(EXPORT_DIR, `${table}.json`),
      JSON.stringify(rows, null, 2) + "\n",
      "utf8"
    );
  }

  fs.writeFileSync(
    path.join(EXPORT_DIR, "data-export.json"),
    JSON.stringify(exportPayload, null, 2) + "\n",
    "utf8"
  );

  fs.writeFileSync(
    path.join(EXPORT_DIR, "schema-summary.json"),
    JSON.stringify(schemaSummary, null, 2) + "\n",
    "utf8"
  );

  console.log("Export complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
