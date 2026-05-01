import { describe, it, expect } from "vitest";
import {
  programToRow,
  rowToProgram,
  lectureToRow,
  rowToLecture,
  attachmentToRow,
  rowToAttachment,
} from "@/lib/db-mappers";

describe("db-mappers", () => {
  it("Program ↔ row 왕복 변환", () => {
    const p = {
      id: "p1",
      name: "테스트 프로그램",
      category: "branding" as const,
      description: "설명",
      url: "https://example.com",
      thumbnail: "thumb.png",
      tags: ["a", "b"],
      createdAt: "2026-05-01",
      status: "public" as const,
      github: "https://github.com/x",
      note: "메모",
    };
    expect(rowToProgram(programToRow(p))).toEqual(p);
  });

  it("Lecture ↔ row 왕복 변환 (첨부 제외)", () => {
    const l = {
      id: "l1",
      title: "강의 제목",
      organization: "기관",
      contactPerson: "담당자",
      contactEmail: "a@b.com",
      contactPhone: "010-0000-0000",
      lectureType: "online" as const,
      date: "2026-05-01",
      endDate: "2026-05-02",
      hours: 4,
      curriculum: "교육과정",
      description: "메모",
      attachments: [],
      status: "completed" as const,
      tags: ["x", "y"],
      fee: "500000",
      createdAt: "2026-04-30",
    };
    expect(rowToLecture(lectureToRow(l))).toEqual(l);
  });

  it("Attachment ↔ row 왕복 변환", () => {
    const a = {
      id: "a1",
      name: "이메일",
      type: "email" as const,
      url: "mailto:x@y.com",
      memo: "회신 받음",
      addedAt: "2026-05-01",
    };
    expect(rowToAttachment(attachmentToRow("l1", a))).toEqual(a);
  });
});
