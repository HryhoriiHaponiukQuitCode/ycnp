import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type InvitePayload = {
  organizationId?: string;
  email?: string;
  role?: string;
};

function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto ?? url.protocol.replace(":", "");
  return forwardedHost ? `${protocol}://${forwardedHost}` : url.origin;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InvitePayload;
    const organizationId = body.organizationId?.trim();
    const email = body.email?.trim().toLowerCase();
    const role = body.role?.trim() || "viewer";

    if (!organizationId || !email) {
      return NextResponse.json({ error: "organizationId and email are required." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const [{ data: membership, error: membershipError }, { data: isSuperAdmin, error: superAdminError }] =
      await Promise.all([
        supabase
          .from("org_members")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.rpc("is_super_admin"),
      ]);

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 400 });
    }

    if (superAdminError) {
      return NextResponse.json({ error: superAdminError.message }, { status: 400 });
    }

    if (!membership && !isSuperAdmin) {
      return NextResponse.json({ error: "You do not have access to invite users to this organization." }, { status: 403 });
    }

    const { data: invite, error: inviteError } = await supabase.rpc("create_org_invite", {
      p_organization_id: organizationId,
      p_email: email,
      p_role: role,
    });

    if (inviteError || !invite) {
      return NextResponse.json({ error: inviteError?.message || "Failed to create invite." }, { status: 400 });
    }

    const admin = createAdminClient();
    const redirectTo = `${getBaseUrl(request)}/invite/setup-password?token=${encodeURIComponent(invite.token)}`;
    const { error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        organization_id: organizationId,
        invite_token: invite.token,
        invite_role: role,
      },
    });

    if (authError) {
      await supabase.from("org_invites").delete().eq("id", invite.id);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        email,
        role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 }
    );
  }
}
