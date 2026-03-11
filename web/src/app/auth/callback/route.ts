import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const protocol = forwardedProto ?? new URL(origin).protocol.replace(":", "");
  const baseUrl = !isLocalEnv && forwardedHost ? `${protocol}://${forwardedHost}` : origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  const error = searchParams.get("error") ?? "auth_callback_error";
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");
  const loginUrl = new URL(`${baseUrl}/login`);
  loginUrl.searchParams.set("error", error);
  if (errorCode) loginUrl.searchParams.set("error_code", errorCode);
  if (errorDescription) loginUrl.searchParams.set("error_description", errorDescription);
  if (next) loginUrl.searchParams.set("next", next);

  return NextResponse.redirect(loginUrl);
}
