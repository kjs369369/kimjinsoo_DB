import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdminToken, extractTokenFromRequest } from "@/lib/admin-token";
import { programToRow, rowToProgram } from "@/lib/db-mappers";
import { Program } from "@/lib/types";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!verifyAdminToken(extractTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as Program;
  const supabase = getSupabaseAdmin();
  const row = programToRow({ ...body, id: params.id });
  const { id: _ignore, ...patch } = row;
  const { data, error } = await supabase
    .from("programs")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: rowToProgram(data as Record<string, unknown>) });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!verifyAdminToken(extractTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("programs").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
