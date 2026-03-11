import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function buildPlaceholderEmail(solicitorId) {
  return `legacy-solicitor+${solicitorId}@placeholder.invalid`;
}

function buildMemberPlaceholderEmail(userId) {
  return `legacy-member+${userId}@placeholder.invalid`;
}

function randomPassword() {
  return crypto.randomBytes(24).toString("base64url");
}

async function createSilentUser({ email, fullName, metadata = {} }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      ...metadata,
    },
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
  });

  if (error) {
    throw new Error(`Failed to create user for ${email}: ${error.message}`);
  }

  return data.user;
}

async function backfillMissingOrgMemberUsers() {
  const { data: missingMembers, error } = await supabase.rpc("get_org_members_with_emails", {
    p_organization_id: "00000000-0000-0000-0000-000000000000",
  });

  if (error && !/organization/i.test(error.message)) {
    // Ignore: this RPC enforces org access and is not usable for service-role backfill.
  }

  const { data: orgMembers, error: membersError } = await supabase
    .from("org_members")
    .select("id, organization_id, user_id, role")
    .order("created_at", { ascending: true });

  if (membersError) {
    throw membersError;
  }

  const existingUserIds = new Set(
    (
      await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })
    ).data.users.map((user) => user.id)
  );

  const createdByLegacyId = new Map();
  for (const member of orgMembers || []) {
    if (existingUserIds.has(member.user_id)) {
      continue;
    }

    let replacementUser = createdByLegacyId.get(member.user_id);
    if (!replacementUser) {
      replacementUser = await createSilentUser({
        email: buildMemberPlaceholderEmail(member.user_id),
        fullName: `Legacy ${member.role} user`,
        metadata: {
          placeholder_account: true,
          legacy_member_user_id: member.user_id,
        },
      });
      createdByLegacyId.set(member.user_id, replacementUser);
    }

    const { error: updateError } = await supabase
      .from("org_members")
      .update({ user_id: replacementUser.id })
      .eq("id", member.id);

    if (updateError) {
      throw new Error(`Failed to update org member ${member.id}: ${updateError.message}`);
    }

    console.log(`Linked org member ${member.id} -> ${replacementUser.id}`);
  }
}

async function backfillMissingSuperAdmins() {
  const { data: rows, error } = await supabase
    .from("super_admins")
    .select("email");

  if (error) {
    throw error;
  }

  const existingUsers = new Map();
  const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of users.data.users) {
    if (user.email) {
      existingUsers.set(user.email.toLowerCase(), user);
    }
  }

  for (const row of rows || []) {
    const email = row.email?.toLowerCase();
    if (!email || existingUsers.has(email)) {
      continue;
    }

    const user = await createSilentUser({
      email,
      fullName: email,
      metadata: {
        placeholder_account: true,
        legacy_super_admin: true,
      },
    });

    console.log(`Created missing super admin user ${user.id} for ${email}`);
  }
}

async function main() {
  await backfillMissingOrgMemberUsers();
  await backfillMissingSuperAdmins();

  const { data: solicitors, error } = await supabase
    .from("solicitors")
    .select("id, organization_id, user_id, name, email, phone")
    .is("user_id", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  if (!solicitors?.length) {
    console.log("No solicitors without user_id found.");
    return;
  }

  for (const solicitor of solicitors) {
    const placeholderEmail = buildPlaceholderEmail(solicitor.id);
    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: placeholderEmail,
      password: randomPassword(),
      email_confirm: true,
      user_metadata: {
        full_name: solicitor.name,
        placeholder_account: true,
        legacy_solicitor_id: solicitor.id,
        organization_id: solicitor.organization_id,
      },
      app_metadata: {
        provider: "email",
        providers: ["email"],
      },
    });

    if (createUserError) {
      throw new Error(`Failed to create placeholder user for solicitor ${solicitor.id}: ${createUserError.message}`);
    }

    const { error: updateError } = await supabase
      .from("solicitors")
      .update({ user_id: createdUser.user.id })
      .eq("id", solicitor.id);

    if (updateError) {
      throw new Error(`Failed to update solicitor ${solicitor.id}: ${updateError.message}`);
    }

    console.log(`Linked solicitor ${solicitor.name} -> ${createdUser.user.id}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
