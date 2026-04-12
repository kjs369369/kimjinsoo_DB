"use client";

/**
 * Google Sheets (Apps Script) API 클라이언트
 * 환경변수: NEXT_PUBLIC_GAS_URL — Apps Script 웹앱 배포 URL
 */

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || "";

export type SheetName = "Main" | "Programs" | "Lectures" | "Vault";

export type SheetSummary = Record<SheetName, { count: number }>;

// ── 연결 상태 확인 ──

export function isConnected(): boolean {
  return GAS_URL.length > 0;
}

// ── GET: 조회 ──

export async function fetchSheet<T = Record<string, unknown>>(
  sheet: SheetName,
): Promise<T[]> {
  if (!GAS_URL) return [];
  const res = await fetch(`${GAS_URL}?sheet=${sheet}`, { redirect: "follow" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "fetch failed");
  return json.data as T[];
}

export async function fetchSummary(): Promise<SheetSummary | null> {
  if (!GAS_URL) return null;
  const res = await fetch(`${GAS_URL}?sheet=summary`, { redirect: "follow" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "summary failed");
  return json.data as SheetSummary;
}

// ── POST: 생성 ──

async function postToGas(body: Record<string, unknown>) {
  if (!GAS_URL) throw new Error("GAS_URL not configured");
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // Apps Script CORS 우회
    body: JSON.stringify(body),
    redirect: "follow",
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "post failed");
  return json;
}

export async function createRow(sheet: SheetName, data: Record<string, unknown>) {
  return postToGas({ method: "create", sheet, data });
}

export async function updateRow(sheet: SheetName, data: Record<string, unknown>) {
  return postToGas({ method: "update", sheet, data });
}

export async function deleteRow(sheet: SheetName, id: string) {
  return postToGas({ method: "delete", sheet, id });
}

export async function bulkWrite(sheet: SheetName, data: Record<string, unknown>[]) {
  return postToGas({ method: "bulk", sheet, data });
}
