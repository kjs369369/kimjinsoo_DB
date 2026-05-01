import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdminToken, extractTokenFromRequest } from "@/lib/admin-token";
import { lectureToRow, attachmentToRow } from "@/lib/db-mappers";
import { Lecture } from "@/lib/types";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!verifyAdminToken(extractTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as Lecture;
  const supabase = getSupabaseAdmin();

  const { id: _ignore, ...patch } = lectureToRow(body);
  const { error: lerr } = await supabase
    .from("lectures")
    .update(patch)
    .eq("id", params.id);
  if (lerr) return NextResponse.json({ ok: false, error: lerr.message }, { status: 500 });

  // 첨부는 전부 삭제 후 재삽입 (단순화 — 단일 사용자)
  await supabase.from("lecture_attachments").delete().eq("lecture_id", params.id);
  if (body.attachments?.length) {
    const rows = body.attachments.map((a) => attachmentToRow(params.id, a));
    const { error: aerr } = await supabase.from("lecture_attachments").insert(rows);
    if (aerr) return NextResponse.json({ ok: false, error: aerr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!verifyAdminToken(extractTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("lectures").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
