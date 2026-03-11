import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.PROD_SUPABASE_URL || process.env.PROD_NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { error } = await supabase.from("organizations").insert({
    id: "00000000-0000-0000-0000-000000000001",
    name: "probe",
    slug: "probe",
  });

  console.log(error ? { message: error.message, details: error.details, hint: error.hint, code: error.code } : { ok: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
