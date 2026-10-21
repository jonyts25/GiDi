import { ObjectiveBankService } from "./objective-bank.service";
import { PrismaService } from "../prisma.service";

const VIEWER_ADMIN = "admin-1";
const VIEWER_THERAPIST = "therapist-viewer";
const OWNER_THERAPIST = "therapist-owner";
const AREA_ID = "area-1";

function buildService(rows: { id: string; creatorId: string; isPublic: boolean; areaId: string }[]) {
  const prisma = {
    objectiveBank: {
      findMany: jest.fn(async ({ where }: { where: { OR: unknown[]; areaId?: string } }) => {
        return rows.filter((row) => {
          if (where.areaId && row.areaId !== where.areaId) return false;
          const or = where.OR as Record<string, unknown>[];
          return or.some((clause) => {
            if ("isPublic" in clause && clause.isPublic === true) return row.isPublic;
            if ("creatorId" in clause && clause.creatorId === row.creatorId) {
              if ("isPublic" in clause && clause.isPublic === false) return !row.isPublic;
              return true;
            }
            return false;
          });
        });
      }),
    },
  } as unknown as PrismaService;

  return { service: new ObjectiveBankService(prisma), findMany: prisma.objectiveBank.findMany as jest.Mock };
}

describe("ObjectiveBankService.listTherapistBank ownerId", () => {
  const catalog = [
    { id: "pub-1", creatorId: "other", isPublic: true, areaId: AREA_ID },
    { id: "priv-owner", creatorId: OWNER_THERAPIST, isPublic: false, areaId: AREA_ID },
    { id: "priv-viewer", creatorId: VIEWER_THERAPIST, isPublic: false, areaId: AREA_ID },
  ];

  it("admin con ownerId ve privados de esa terapeuta", async () => {
    const { service } = buildService(catalog);
    const rows = await service.listTherapistBank(
      VIEWER_ADMIN,
      ["ADMIN"],
      AREA_ID,
      OWNER_THERAPIST,
    );
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual(["priv-owner", "pub-1"].sort());
  });

  it("terapeuta con ownerId de otra NO ve sus privados", async () => {
    const { service } = buildService(catalog);
    const rows = await service.listTherapistBank(
      VIEWER_THERAPIST,
      ["THERAPIST"],
      AREA_ID,
      OWNER_THERAPIST,
    );
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual(["priv-viewer", "pub-1"].sort());
    expect(ids).not.toContain("priv-owner");
  });
});
