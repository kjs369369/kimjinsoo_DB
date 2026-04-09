import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Vault 페이지 비밀번호 검증 API.
 * - VAULT_PASSWORD 환경변수에 비밀번호 저장 (.env.local)
 * - 설정 안 되어 있으면 기본값 "1234" 사용 (개발용 — 배포 전 반드시 변경!)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input: string = (body?.password || "").toString();

    const expected = process.env.VAULT_PASSWORD || "1234";

    // 타이밍 공격 방지를 위한 길이 우선 비교 후 상수-시간 비교
    if (input.length !== expected.length) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= input.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    if (mismatch !== 0) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      isDefault: !process.env.VAULT_PASSWORD,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
