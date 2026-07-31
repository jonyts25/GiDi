import {
  assertCanBeParent,
  assertRoleSetCompatible,
  hasParentPortalAccess,
  hasStaffRole,
} from "./role-permissions";
import { RoleKey } from "@prisma/client";

describe("role-permissions (parent/staff)", () => {
  it("detects staff roles", () => {
    expect(hasStaffRole(["SECRETARY"])).toBe(true);
    expect(hasStaffRole(["PARENT"])).toBe(false);
  });

  it("allows parent portal only for pure parents", () => {
    expect(hasParentPortalAccess(["PARENT"])).toBe(true);
    expect(hasParentPortalAccess(["PARENT", "SECRETARY"])).toBe(false);
    expect(hasParentPortalAccess(["SECRETARY"])).toBe(false);
  });

  it("rejects staff users as guardians", () => {
    expect(() => assertCanBeParent([RoleKey.SECRETARY])).toThrow(
      /no puede ser padre\/tutor/,
    );
    expect(() => assertCanBeParent([RoleKey.PARENT])).not.toThrow();
  });

  it("rejects incompatible role combinations on user update", () => {
    expect(() => assertRoleSetCompatible([RoleKey.PARENT, RoleKey.ADMIN])).toThrow(
      /no pueden combinarse/,
    );
    expect(() => assertRoleSetCompatible([RoleKey.PARENT, RoleKey.SCHOOL])).not.toThrow();
  });
});
