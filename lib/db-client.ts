"use client";
import { Program, Lecture } from "./types";

const ADMIN_TOKEN_KEY = "kimjinsoo_admin_token_v1";

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const token = getAdminToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

// ── Programs ──

export async function createProgram(p: Program): Promise<Program | null> {
  const res = await fetch("/api/db/programs", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(p),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.ok ? (json.data as Program) : null;
}

export async function updateProgram(p: Program): Promise<Program | null> {
  const res = await fetch(`/api/db/programs/${encodeURIComponent(p.id)}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(p),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.ok ? (json.data as Program) : null;
}

export async function deleteProgram(id: string): Promise<boolean> {
  const res = await fetch(`/api/db/programs/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return res.ok;
}

// ── Lectures ──

export async function createLecture(l: Lecture): Promise<boolean> {
  const res = await fetch("/api/db/lectures", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(l),
  });
  return res.ok;
}

export async function updateLecture(l: Lecture): Promise<boolean> {
  const res = await fetch(`/api/db/lectures/${encodeURIComponent(l.id)}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(l),
  });
  return res.ok;
}

export async function deleteLecture(id: string): Promise<boolean> {
  const res = await fetch(`/api/db/lectures/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return res.ok;
}
