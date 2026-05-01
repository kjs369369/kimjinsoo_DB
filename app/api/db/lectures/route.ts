import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { verifyAdminToken, extractTokenFromRequest } from "@/lib/admin-token";
import {
  lectureToRow,
  rowToLecture,
  attachmentToRow,
  rowToAttachment,
} from "@/lib/db-mappers";
import { Lecture, LectureAttachment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data: lectures, error: lerr } = await supabase
    .from("lectures")
    .select("*")
    .order("date", { ascending: false });
  if (lerr) return NextResponse.json({ ok: false, error: lerr.message }, { status: 500 });

  const { data: atts, error: aerr } = await supabase
    .from("lecture_attachments")
    .select("*");
  if (aerr) return NextResponse.json({ ok: false, error: aerr.message }, { status: 500 });

  const byLecture = new Map<string, LectureAttachment[]>();
  for (const a of atts ?? []) {
    const id = String((a as Record<string, unknown>).lecture_id);
    if (!byLecture.has(id)) byLecture.set(id, []);
    byLecture.get(id)!.push(rowToAttachment(a as Record<string, unknown>));
  }

  const result = (lectures ?? []).map((l) =>
    rowToLecture(
      l as Record<string, unknown>,
      byLecture.get(String((l as Record<string, unknown>).id)) ?? [],
    ),
  );
  return NextResponse.json({ ok: true, data: result });
}

export async function POST(req: Request) {
  if (!verifyAdminToken(extractTokenFromRequest(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as Lecture;
  const supabase = getSupabaseAdmin();

  const { error: lerr } = await supabase.from("lectures").insert(lectureToRow(body));
  if (lerr) return NextResponse.json({ ok: false, error: lerr.message }, { status: 500 });

  if (body.attachments?.length) {
    const rows = body.attachments.map((a) => attachmentToRow(body.id, a));
    const { error: aerr } = await supabase.from("lecture_attachments").insert(rows);
    if (aerr) return NextResponse.json({ ok: false, error: aerr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
