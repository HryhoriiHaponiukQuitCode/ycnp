import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

const ORG_ID = "2cebd411-31de-4bcd-988c-69f67bda1cb3";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../..", "Client Request");

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const allowedGenerosity = new Set([
  "Cool",
  "On Fire!",
  "Hot",
  "Cold",
  "Warm",
  "Not Scanned",
]);

const allowedProfileAccuracy = new Set(["High", "Low"]);
const allowedAskMethods = new Set([
  "In Person",
  "Phone",
  "Phone call",
  "Email",
  "Text / WhatsApp",
]);

function readCsv(filename) {
  const content = fs.readFileSync(filename, "utf8");
  return parse(content, {
    columns: (header) => header.map((h) => h.replace(/^\uFEFF/, "").trim()),
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
}

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  const trimmed = `${value}`.trim();
  return trimmed === "" ? null : trimmed;
}

function parseCurrency(value) {
  if (!value) return null;
  const cleaned = `${value}`.replace(/[^0-9.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseDate(value) {
  if (!value) return null;
  const parts = `${value}`.split(/[\/\-]/).map((p) => p.trim());
  if (parts.length === 3) {
    let [a, b, c] = parts;
    // Support DD/MM/YYYY or MM/DD/YYYY
    if (c.length === 4) {
      const dayFirst = Number(a);
      const monthFirst = Number(b);
      const day = dayFirst > 12 ? dayFirst : Number(b);
      const month = dayFirst > 12 ? monthFirst : Number(a);
      const iso = new Date(Date.UTC(Number(c), month - 1, day));
      return isNaN(iso.getTime()) ? null : iso.toISOString();
    }
    // Support YYYY-MM-DD
    if (a.length === 4) {
      const iso = new Date(Date.UTC(Number(a), Number(b) - 1, Number(c)));
      return isNaN(iso.getTime()) ? null : iso.toISOString();
    }
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseBoolFromCheck(value) {
  if (!value) return false;
  const normalized = `${value}`.toLowerCase();
  return ["checked", "true", "yes", "1"].some((v) =>
    normalized.includes(v)
  );
}

function toArray(value) {
  if (!value) return [];
  return `${value}`
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeName(name) {
  return name ? name.trim().toLowerCase() : "";
}

function mapAskMethod(value) {
  if (!value) return null;
  const normalized = value.trim();
  if (allowedAskMethods.has(normalized)) return normalized;
  if (normalized.toLowerCase() === "whatsapp") return "Text / WhatsApp";
  if (normalized.toLowerCase() === "text") return "Text / WhatsApp";
  if (normalized.toLowerCase() === "phone call") return "Phone call";
  return null;
}

async function getFiscalYearId() {
  const { data, error } = await supabase
    .from("fiscal_years")
    .select("id,label,is_current")
    .eq("organization_id", ORG_ID);
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      "No fiscal years found for organization. Please create one before running import."
    );
  }
  const current = data.find((fy) => fy.is_current);
  if (current) return current.id;
  const byLabel = data.find((fy) => /24/.test(fy.label) || /2024/.test(fy.label));
  return (byLabel || data[0]).id;
}

async function upsertDonors(donorRows) {
  const { data: existing, error: existingError } = await supabase
    .from("donors")
    .select("id,name")
    .eq("organization_id", ORG_ID);
  if (existingError) throw existingError;
  const existingMap = new Map(
    (existing || []).map((d) => [normalizeName(d.name), d.id])
  );

  const toInsert = donorRows
    .map((row) => {
      const name = emptyToNull(row["Name"]);
      if (!name) return null;
      return {
        name,
        first_name: emptyToNull(row["First Name"]),
        last_name: emptyToNull(row["Last Name"]),
        formal_name: emptyToNull(row["Formal Name"]),
        informal_name: emptyToNull(row["Informal Name"]),
        recognition_name: emptyToNull(row["Recognition Name"]),
        envelope_name: emptyToNull(row["Envelope Name"]),
        household_name: emptyToNull(row["Household Name"]),
        mail_merge_greeting: emptyToNull(row["Mail Merge Greeting"]),
        address: emptyToNull(row["Address"]),
        city: emptyToNull(row["City"]),
        state: emptyToNull(row["State"]),
        zip_code: emptyToNull(row["Zip Code"]),
        email: emptyToNull(row["Email"]),
        primary_phone: emptyToNull(row["Primary Phone"]),
        mobile_phone: emptyToNull(row["Mobile Phone"]),
        home_phone: emptyToNull(row["Home Phone"]),
        generosity_score: allowedGenerosity.has(row["Generosity Score"]) ? row["Generosity Score"] : null,
        wealth_capacity: emptyToNull(row["Wealth Capacity"]),
        profile_accuracy: allowedProfileAccuracy.has(row["Profile Accuracy"]) ? row["Profile Accuracy"] : null,
        ask_goal: parseCurrency(row["Ask Goal"]),
        ask_date: parseDate(row["Ask Date"]),
        ask_method: mapAskMethod(row["Ask Method"]),
        ask_partner: emptyToNull(row["Ask Partner"]),
        ask_purpose: emptyToNull(row["Ask Purpose/Project"]),
        moves_needed_override: parseNumber(row["Manual Override"]),
        relationship_to_organization: emptyToNull(
          row["Relationship to Organization"]
        ),
        donor_interests: emptyToNull(row["What is the donor interested in?"]),
        previous_solicitor: emptyToNull(row["Previous Solicitor"]),
        organization_id: ORG_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean)
    .filter((d) => !existingMap.has(normalizeName(d.name)));

  console.log(`Preparing to insert ${toInsert.length} donors`);

  for (let i = 0; i < toInsert.length; i += 500) {
    const slice = toInsert.slice(i, i + 500);
    const { error } = await supabase.from("donors").insert(slice);
    if (error) throw error;
    console.log(`Inserted donors ${i + 1}-${i + slice.length}`);
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from("donors")
    .select("id,name")
    .eq("organization_id", ORG_ID);
  if (refreshError) throw refreshError;
  return new Map(refreshed.map((d) => [normalizeName(d.name), d.id]));
}

async function upsertMoveIdeas(ideaRows) {
  const { data: existing, error } = await supabase
    .from("move_ideas")
    .select("id,name")
    .eq("organization_id", ORG_ID);
  if (error) throw error;
  const existingMap = new Map(
    (existing || []).map((i) => [normalizeName(i.name), i.id])
  );

  const toInsert = ideaRows
    .map((row) => {
      const name = emptyToNull(row["Move"]);
      if (!name) return null;
      return {
        name,
        types: toArray(row["Type"]),
        purpose: toArray(row["Purpose"]),
        methods: toArray(row["Method"]),
        notes: emptyToNull(row["Notes"]),
        is_global: false,
        organization_id: ORG_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean)
    .filter((i) => !existingMap.has(normalizeName(i.name)));

  console.log(`Preparing to insert ${toInsert.length} move ideas`);

  for (let i = 0; i < toInsert.length; i += 500) {
    const slice = toInsert.slice(i, i + 500);
    const { error: insertError } = await supabase
      .from("move_ideas")
      .insert(slice);
    if (insertError) throw insertError;
    console.log(`Inserted move ideas ${i + 1}-${i + slice.length}`);
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from("move_ideas")
    .select("id,name")
    .eq("organization_id", ORG_ID);
  if (refreshError) throw refreshError;
  return new Map(refreshed.map((i) => [normalizeName(i.name), i.id]));
}

async function insertMoves(moveRows, donorsMap, moveIdeasMap) {
  const toInsert = moveRows
    .map((row) => {
      const donorName = emptyToNull(row["Donor"]);
      const donorId = donorName ? donorsMap.get(normalizeName(donorName)) : null;
      if (!donorId) return null;

      const ideaName =
        emptyToNull(row["Select Move Idea"]) ||
        emptyToNull(row["Move"]) ||
        emptyToNull(row["Move Name"]);
      const moveIdeaId = ideaName
        ? moveIdeasMap.get(normalizeName(ideaName)) || null
        : null;

      const name =
        emptyToNull(row["Move Name"]) ||
        emptyToNull(row["Move"]) ||
        ideaName ||
        "Move";

      return {
        name,
        donor_id: donorId,
        move_idea_id: moveIdeaId,
        due_date: parseDate(row["Due Date"]),
        month: emptyToNull(row["Month"]),
        notes: emptyToNull(row["Move Notes"]),
        is_completed: parseBoolFromCheck(row["Completed"]),
        completed_at: parseDate(row["Completed Date"]),
        assigned_to: null,
        organization_id: ORG_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  console.log(`Preparing to insert ${toInsert.length} moves`);

  for (let i = 0; i < toInsert.length; i += 500) {
    const slice = toInsert.slice(i, i + 500);
    const { error } = await supabase.from("moves").insert(slice);
    if (error) throw error;
    console.log(`Inserted moves ${i + 1}-${i + slice.length}`);
  }
}

async function upsertSolicitorsAndAssignments(solicitorRows, donorsMap, fiscalYearId) {
  const { data: existing, error } = await supabase
    .from("solicitors")
    .select("id,name")
    .eq("organization_id", ORG_ID);
  if (error) throw error;
  const existingMap = new Map(
    (existing || []).map((s) => [normalizeName(s.name), s.id])
  );

  const now = new Date().toISOString();

  const newSolicitors = solicitorRows
    .map((row) => {
      const name = emptyToNull(row["Solicitor"]);
      if (!name) return null;
      return {
        name,
        notes: emptyToNull(row["Notes"]),
        organization_id: ORG_ID,
        is_active: true,
        created_at: now,
        updated_at: now,
      };
    })
    .filter(Boolean)
    .filter((s) => !existingMap.has(normalizeName(s.name)));

  console.log(`Preparing to insert ${newSolicitors.length} solicitors`);
  for (let i = 0; i < newSolicitors.length; i += 200) {
    const slice = newSolicitors.slice(i, i + 200);
    const { error: insertError } = await supabase
      .from("solicitors")
      .insert(slice);
    if (insertError) throw insertError;
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from("solicitors")
    .select("id,name")
    .eq("organization_id", ORG_ID);
  if (refreshError) throw refreshError;
  const solicitorMap = new Map(
    refreshed.map((s) => [normalizeName(s.name), s.id])
  );

  // solicitor fiscal year records
  const fiscalRecords = solicitorRows
    .map((row) => {
      const name = emptyToNull(row["Solicitor"]);
      if (!name) return null;
      const solicitorId = solicitorMap.get(normalizeName(name));
      if (!solicitorId) return null;
      return {
        fiscal_year_id: fiscalYearId,
        solicitor_id: solicitorId,
        title: emptyToNull(row["24-25 Solicitor Title"]),
        letter_signature: emptyToNull(row["24-25 Letter Signature"]),
        letter_signature_title: emptyToNull(
          row["24-25 Letter Signature Title"]
        ),
        created_at: now,
      };
    })
    .filter(Boolean);

  if (fiscalRecords.length > 0) {
    console.log(`Upserting ${fiscalRecords.length} solicitor fiscal year records`);
    for (let i = 0; i < fiscalRecords.length; i += 500) {
      const slice = fiscalRecords.slice(i, i + 500);
      const { error: insertError } = await supabase
        .from("solicitor_fiscal_years")
        .upsert(slice, { onConflict: "fiscal_year_id,solicitor_id" });
      if (insertError) throw insertError;
    }
  }

  // donor assignments
  const assignments = [];
  for (const row of solicitorRows) {
    const solicitorName = emptyToNull(row["Solicitor"]);
    if (!solicitorName) continue;
    const solicitorId = solicitorMap.get(normalizeName(solicitorName));
    if (!solicitorId) continue;
    const donorNames = toArray(row["Donors"]);
    donorNames.forEach((dn) => {
      const donorId = donorsMap.get(normalizeName(dn));
      if (!donorId) return;
      assignments.push({
        donor_id: donorId,
        solicitor_id: solicitorId,
        fiscal_year_id: fiscalYearId,
        is_primary: true,
        created_at: now,
      });
    });
  }

  if (assignments.length > 0) {
    console.log(`Inserting ${assignments.length} donor-solicitor assignments`);
    for (let i = 0; i < assignments.length; i += 500) {
      const slice = assignments.slice(i, i + 500);
      const { error: insertError } = await supabase
        .from("donor_solicitor_assignments")
        .upsert(slice, { onConflict: "donor_id,fiscal_year_id,solicitor_id" });
      if (insertError) throw insertError;
    }
  }
}

async function main() {
  console.log("Starting import...");
  const fiscalYearId = await getFiscalYearId();
  console.log(`Using fiscal year ${fiscalYearId}`);

  const donorRows = readCsv(path.join(DATA_DIR, "Donors-All Donors.csv"));
  const moveIdeasRows = readCsv(
    path.join(DATA_DIR, "Move Ideas-All Ideas.csv")
  );
  const movesRows = readCsv(path.join(DATA_DIR, "Moves-All Moves.csv"));
  const solicitorRows = readCsv(
    path.join(DATA_DIR, "Solicitors-Grid view.csv")
  );

  console.log(
    `Loaded counts -> donors: ${donorRows.length}, move ideas: ${moveIdeasRows.length}, moves: ${movesRows.length}, solicitors: ${solicitorRows.length}`
  );

  const donorsMap = await upsertDonors(donorRows);
  console.log(`Total donors available: ${donorsMap.size}`);

  const moveIdeasMap = await upsertMoveIdeas(moveIdeasRows);
  console.log(`Total move ideas available: ${moveIdeasMap.size}`);

  await insertMoves(movesRows, donorsMap, moveIdeasMap);
  await upsertSolicitorsAndAssignments(solicitorRows, donorsMap, fiscalYearId);

  console.log("Import complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
