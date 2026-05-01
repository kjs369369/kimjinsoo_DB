import { Program, Lecture, LectureAttachment } from "./types";

export function programToRow(p: Program) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    url: p.url,
    thumbnail: p.thumbnail,
    tags: p.tags,
    created_at: p.createdAt,
    status: p.status,
    github: p.github,
    note: p.note,
  };
}

export function rowToProgram(r: Record<string, unknown>): Program {
  return {
    id: String(r.id),
    name: String(r.name),
    category: r.category as Program["category"],
    description: String(r.description ?? ""),
    url: String(r.url ?? ""),
    thumbnail: String(r.thumbnail ?? ""),
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    createdAt: String(r.created_at ?? ""),
    status: (r.status as Program["status"]) || "public",
    github: String(r.github ?? ""),
    note: String(r.note ?? ""),
  };
}

export function lectureToRow(l: Lecture) {
  return {
    id: l.id,
    title: l.title,
    organization: l.organization,
    contact_person: l.contactPerson,
    contact_email: l.contactEmail,
    contact_phone: l.contactPhone,
    lecture_type: l.lectureType,
    date: l.date,
    end_date: l.endDate,
    hours: l.hours,
    curriculum: l.curriculum,
    description: l.description,
    status: l.status,
    tags: l.tags,
    fee: l.fee,
    created_at: l.createdAt,
  };
}

export function rowToLecture(
  r: Record<string, unknown>,
  attachments: LectureAttachment[] = [],
): Lecture {
  return {
    id: String(r.id),
    title: String(r.title),
    organization: String(r.organization ?? ""),
    contactPerson: String(r.contact_person ?? ""),
    contactEmail: String(r.contact_email ?? ""),
    contactPhone: String(r.contact_phone ?? ""),
    lectureType: (r.lecture_type as Lecture["lectureType"]) || "offline",
    date: String(r.date ?? ""),
    endDate: String(r.end_date ?? ""),
    hours: Number(r.hours ?? 0),
    curriculum: String(r.curriculum ?? ""),
    description: String(r.description ?? ""),
    attachments,
    status: (r.status as Lecture["status"]) || "completed",
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    fee: String(r.fee ?? ""),
    createdAt: String(r.created_at ?? ""),
  };
}

export function attachmentToRow(lectureId: string, a: LectureAttachment) {
  return {
    id: a.id,
    lecture_id: lectureId,
    name: a.name,
    type: a.type,
    url: a.url,
    memo: a.memo,
    added_at: a.addedAt,
  };
}

export function rowToAttachment(r: Record<string, unknown>): LectureAttachment {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    type: (r.type as LectureAttachment["type"]) || "etc",
    url: String(r.url ?? ""),
    memo: String(r.memo ?? ""),
    addedAt: String(r.added_at ?? ""),
  };
}
