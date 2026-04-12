"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

const ADMIN_AUTH_KEY = "kimjinsoo_admin_auth_v1";
const CLICK_THRESHOLD = 3;
const CLICK_WINDOW_MS = 2000;

export function useAdminGate() {
  return typeof window !== "undefined"
    ? sessionStorage.getItem(ADMIN_AUTH_KEY) === "1"
    : false;
}

export default function AdminAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const clickTimestamps = useRef<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogoClick = useCallback(
    (e: React.MouseEvent) => {
      const now = Date.now();
      clickTimestamps.current.push(now);
      // 윈도우 밖의 오래된 클릭 제거
      clickTimestamps.current = clickTimestamps.current.filter(
        (t) => now - t < CLICK_WINDOW_MS,
      );
      if (clickTimestamps.current.length >= CLICK_THRESHOLD) {
        e.preventDefault(); // 3번째 클릭에서만 네비게이션 차단
        clickTimestamps.current = [];
        if (sessionStorage.getItem(ADMIN_AUTH_KEY) === "1") {
          router.push("/admin");
        } else {
          setShowModal(true);
          setError("");
          setPw("");
        }
      }
    },
    [router],
  );

  const handleSubmit = async () => {
    if (!pw.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/vault/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem(ADMIN_AUTH_KEY, "1");
        setShowModal(false);
        router.push("/admin");
      } else {
        setError("비밀번호가 일치하지 않습니다.");
      }
    } catch {
      setError("인증 서버 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 로고 영역을 감싸는 클릭 핸들러 */}
      <div onClick={handleLogoClick} className="cursor-pointer">
        {children}
      </div>

      {/* 비밀번호 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="card mx-4 w-full max-w-sm space-y-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-center text-lg font-bold">Admin Access</h3>
            <p className="text-center text-sm text-muted">
              관리자 비밀번호를 입력하세요
            </p>
            <input
              type="password"
              className="input w-full"
              placeholder="Password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
            {error && (
              <p className="text-center text-sm text-[var(--point)]">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                className="btn flex-1"
                onClick={() => setShowModal(false)}
              >
                취소
              </button>
              <button
                className="btn-primary flex-1"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "..." : "확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
