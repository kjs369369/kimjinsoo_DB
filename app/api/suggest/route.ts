import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CATEGORY_LABELS: Record<string, string> = {
  branding: "브랜딩",
  landing: "랜딩페이지",
  lecture: "강의용",
  productivity: "업무생산성",
  "ai-content": "AI콘텐츠",
  "lecture-mgmt": "강의관리",
  etc: "기타",
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local 또는 Vercel 환경변수에 추가해주세요.",
        },
        { status: 500 },
      );
    }

    const body = await req.json();
    const name: string = (body?.name || "").toString().trim();
    const category: string = (body?.category || "etc").toString();
    const url: string = (body?.url || "").toString().trim();

    if (!name) {
      return NextResponse.json(
        { error: "프로그램 이름이 필요합니다." },
        { status: 400 },
      );
    }

    const categoryLabel = CATEGORY_LABELS[category] || category;

    const client = new Anthropic({ apiKey });

    const prompt = `당신은 개인 브랜딩 대시보드의 프로그램 카드용 문구를 작성하는 카피라이터입니다.

다음 정보를 보고 간결하고 매력적인 한국어 "설명(description)"과 3~6개의 "태그(tags)"를 추천해주세요.

[입력]
- 프로그램 이름: ${name}
- 카테고리: ${categoryLabel}
- URL: ${url || "(없음)"}

[요구사항]
- description: 한 문장, 40~80자, 누가·무엇을·왜 쓰는지 명료하게. 홍보 문구 톤 자제, 담백하게.
- tags: 각 1~4글자 한국어 또는 영단어. 중복·포괄적 단어(예: "프로그램") 금지. 검색·필터에 유용하게.
- 출력은 오직 JSON 객체 하나: {"description": "...", "tags": ["...", "..."]}
- JSON 외 다른 텍스트, 코드블록, 설명 금지.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim() || "";

    // Extract JSON object even if model wraps in code fence
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI 응답 파싱 실패", raw: text },
        { status: 502 },
      );
    }

    let parsed: { description?: string; tags?: string[] };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "JSON 파싱 오류", raw: text },
        { status: 502 },
      );
    }

    const description = (parsed.description || "").toString().trim();
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags
          .map((t) => t?.toString().trim().replace(/^#/, ""))
          .filter((t): t is string => !!t)
          .slice(0, 6)
      : [];

    return NextResponse.json({ description, tags });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
