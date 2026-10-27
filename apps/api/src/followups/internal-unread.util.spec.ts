import {
  internalNoteTextChanged,
  internalUnreadPatientScope,
  isInternalFollowUpUnread,
} from "./internal-unread.util";

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
  const lastNoteAt = new Date("2026-10-27T12:00:00Z");

  it("ignora sin lastNoteAt o notas vacías", () => {
    expect(isInternalFollowUpUnread("  ", null, null)).toBe(false);
    expect(isInternalFollowUpUnread("Hola", null, null)).toBe(false);
    expect(isInternalFollowUpUnread(null, lastNoteAt, null)).toBe(false);
  });

  it("marca no leído sin registro seenAt", () => {
    expect(isInternalFollowUpUnread("Hola", lastNoteAt, null)).toBe(true);
  });

  it("marca leído si seenAt >= lastNoteAt", () => {
    expect(isInternalFollowUpUnread("Hola", lastNoteAt, new Date("2026-10-27T12:00:00Z"))).toBe(
      false,
    );
    expect(isInternalFollowUpUnread("Hola", lastNoteAt, new Date("2026-10-27T13:00:00Z"))).toBe(
      false,
    );
  });

  it("marca no leído si la nota se editó después de seenAt", () => {
    expect(isInternalFollowUpUnread("Hola", lastNoteAt, new Date("2026-10-26T12:00:00Z"))).toBe(
      true,
    );
  });
});

describe("internalNoteTextChanged", () => {
  it("detecta cambio real ignorando espacios", () => {
    expect(internalNoteTextChanged("hola", " hola ")).toBe(false);
    expect(internalNoteTextChanged("hola", "adiós")).toBe(true);
  });
});
