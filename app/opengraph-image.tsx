import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kimjinsoo · Official Hub";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0048BA 0%, #000000 70%)",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* 프로필 영역 */}
        <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
          {/* 프로필 사진 (원형) */}
          <img
            src="https://7fmqrwok0eyq5t82.public.blob.vercel-storage.com/images/kw32z.png"
            width={140}
            height={140}
            style={{
              borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.3)",
            }}
          />
          {/* 이름 + 직함 */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 52, fontWeight: 700, color: "#FFFFFF" }}>
              김진수
            </div>
            <div style={{ fontSize: 28, color: "#AAAAAA", marginTop: "4px" }}>
              AICLab 대표
            </div>
          </div>
        </div>

        {/* 소개 텍스트 */}
        <div
          style={{
            fontSize: 24,
            color: "#CCCCCC",
            marginTop: "36px",
            textAlign: "center",
          }}
        >
          브랜딩 · 공식 링크 · 프로그램 아카이브
        </div>

        {/* 하단 정보 */}
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            left: "60px",
            right: "60px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 18, color: "#666666" }}>kimjinsoo_DB</div>
          <div style={{ fontSize: 18, color: "#666666" }}>010-8921-9536</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
