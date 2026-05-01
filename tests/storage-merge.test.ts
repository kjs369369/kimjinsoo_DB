import { describe, it, expect } from "vitest";
import { mergeStates, DEFAULT_STATE } from "@/lib/storage";

describe("mergeStates", () => {
  it("cloud 가 더 최신이면 cloud 채택", () => {
    const local = { ...DEFAULT_STATE, profile: { name: "old", tagline: "", avatar: "" }, _updatedAt: 100 };
    const cloud = { ...DEFAULT_STATE, profile: { name: "new", tagline: "", avatar: "" }, _updatedAt: 200 };
    const merged = mergeStates(local, cloud);
    expect(merged.profile.name).toBe("new");
    expect(merged._updatedAt).toBe(200);
  });

  it("local 이 더 최신이면 local 채택", () => {
    const local = { ...DEFAULT_STATE, profile: { name: "newer", tagline: "", avatar: "" }, _updatedAt: 300 };
    const cloud = { ...DEFAULT_STATE, profile: { name: "older", tagline: "", avatar: "" }, _updatedAt: 200 };
    const merged = mergeStates(local, cloud);
    expect(merged.profile.name).toBe("newer");
    expect(merged._updatedAt).toBe(300);
  });

  it("local만 있으면 local 사용", () => {
    const local = { ...DEFAULT_STATE, profile: { name: "local", tagline: "", avatar: "" }, _updatedAt: 100 };
    const merged = mergeStates(local, null);
    expect(merged.profile.name).toBe("local");
  });

  it("cloud만 있으면 cloud 사용", () => {
    const cloud = { ...DEFAULT_STATE, profile: { name: "cloud", tagline: "", avatar: "" }, _updatedAt: 100 };
    const merged = mergeStates(null, cloud);
    expect(merged.profile.name).toBe("cloud");
  });

  it("둘 다 없으면 DEFAULT_STATE", () => {
    const merged = mergeStates(null, null);
    expect(merged._updatedAt).toBe(0);
    expect(merged.profile.name).toBe(DEFAULT_STATE.profile.name);
  });
});
