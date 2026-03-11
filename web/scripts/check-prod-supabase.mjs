import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.PROD_SUPABASE_URL || process.env.PROD_NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing PROD_NEXT_PUBLIC_SUPABASE_URL/PROD_SUPABASE_URL or PROD_SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tables = [
  "organizations",
  "org_members",
  "fiscal_years",
  "solicitors",
  "solicitor_fiscal_years",
  "donors",
  "donor_scores",
  "donations",
  "donor_solicitor_assignments",
  "move_ideas",
  "moves",
  "donor_tags",
  "donor_tag_assignments",
  "donor_research",
  "meeting_notes",
  "org_invites",
  "super_admins",
];

async function main() {
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(JSON.stringify({ table, ok: false, error: error.message }));
    } else {
      console.log(JSON.stringify({ table, ok: true, count }));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
