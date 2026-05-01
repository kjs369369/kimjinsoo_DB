import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdminToken, extractTokenFromRequest } from "@/lib/admin-token";
import { programToRow, rowToProgram } from "@/lib/db-mappers";
import { Program } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    data: (data ?? []).map((r) => rowToProgram(r as Record<string, unknown>)),
  });
}

export async function POST(req: Request) {
  if (!verifyAdminToken(extractTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as Program;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("programs")
    .insert(programToRow(body))
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: rowToProgram(data as Record<string, unknown>) });
}
