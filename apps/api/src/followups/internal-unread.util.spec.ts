import { internalUnreadPatientScope, isInternalFollowUpUnread } from "./internal-unread.util";

describe("internalUnreadPatientScope", () => {
  it("devuelve all_active para admin y secretaria", () => {
    expect(internalUnreadPatientScope({ sub: "u1", roles: ["ADMIN"] })).toBe("all_active");
    expect(internalUnreadPatientScope({ sub: "u1", roles: ["SECRETARY"] })).toBe("all_active");
    expect(internalUnreadPatientScope({ sub: "u1", roles: ["SUPERADMIN"] })).toBe("all_active");
  });

  it("devuelve therapist_assigned solo para terapeuta", () => {
    expect(internalUnreadPatientScope({ sub: "u1", roles: ["THERAPIST"] })).toBe("therapist_assigned");
  });

  it("devuelve null para otros roles", () => {
    expect(internalUnreadPatientScope({ sub: "u1", roles: ["PARENT"] })).toBe(null);
    expect(internalUnreadPatientScope({ sub: "u1", roles: ["FINANCE"] })).toBe(null);
  });

  it("prioriza all_active si también es terapeuta", () => {
    expect(internalUnreadPatientScope({ sub: "u1", roles: ["THERAPIST", "ADMIN"] })).toBe("all_active");
  });
});

describe("isInternalFollowUpUnread", () => {
  const updated = new Date("2026-10-27T12:00:00Z");

  it("ignora notas vacías", () => {
    expect(isInternalFollowUpUnread("  ", updated, null)).toBe(false);
    expect(isInternalFollowUpUnread(null, updated, null)).toBe(false);
  });

  it("marca no leído sin registro seenAt", () => {
    expect(isInternalFollowUpUnread("Hola", updated, null)).toBe(true);
  });

  it("marca leído si seenAt >= updatedAt", () => {
    expect(isInternalFollowUpUnread("Hola", updated, new Date("2026-10-27T12:00:00Z"))).toBe(false);
    expect(isInternalFollowUpUnread("Hola", updated, new Date("2026-10-27T13:00:00Z"))).toBe(false);
  });

  it("marca no leído si el mensaje se editó después de seenAt", () => {
    expect(isInternalFollowUpUnread("Hola", updated, new Date("2026-10-26T12:00:00Z"))).toBe(true);
  });
});
