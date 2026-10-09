import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { RoleKey } from "@prisma/client";
import { CenterDocumentsService } from "./center-documents.service";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";

const DOC_ID = "doc-1";
const THERAPIST_ONLY = {
  id: DOC_ID,
  title: "Reglamento terapeutas",
  description: null,
  fileName: "reg.pdf",
  mimeType: "application/pdf",
  dataUrl: "data:application/pdf;base64,abc",
  audience: [RoleKey.THERAPIST] as RoleKey[],
  sortOrder: 0,
  isActive: true,
  uploadedById: "admin-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PARENT_ONLY = {
  ...THERAPIST_ONLY,
  id: "doc-2",
  title: "Aviso papás",
  audience: [RoleKey.PARENT] as RoleKey[],
};

const INACTIVE = {
  ...THERAPIST_ONLY,
  id: "doc-inactive",
  isActive: false,
};

function user(roles: string[], sub = "user-1"): AuthUser {
  return { sub, roles } as AuthUser;
}

function buildService(docs: typeof THERAPIST_ONLY[], settings = { officeStaffAccess: true }) {
  const prisma = {
    appSetting: {
      findUnique: async () => ({ key: "center_documents_settings", value: settings }),
      upsert: async () => ({}),
    },
    centerDocument: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        let rows = [...docs];
        if (where.isActive === true) rows = rows.filter((d) => d.isActive);
        const audienceFilter = where.audience as { hasSome?: RoleKey[] } | undefined;
        if (audienceFilter?.hasSome) {
          rows = rows.filter((d) => d.audience.some((a) => audienceFilter.hasSome!.includes(a)));
        }
        return rows.map(({ dataUrl: _d, uploadedById: _u, createdAt, ...meta }) => meta);
      },
      findUnique: async ({ where }: { where: { id: string } }) => docs.find((d) => d.id === where.id) ?? null,
      create: async () => ({}),
      update: async () => ({}),
      delete: async () => ({}),
    },
  } as unknown as PrismaService;

  return new CenterDocumentsService(prisma);
}

describe("CenterDocumentsService visibility", () => {
  it("PARENT no ve documentos solo para THERAPIST", async () => {
    const svc = buildService([THERAPIST_ONLY, PARENT_ONLY]);
    const rows = await svc.list(user(["PARENT"]));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("doc-2");
  });

  it("THERAPIST no ve documentos solo para PARENT", async () => {
    const svc = buildService([THERAPIST_ONLY, PARENT_ONLY]);
    const rows = await svc.list(user(["THERAPIST"]));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(DOC_ID);
  });

  it("SCHOOL recibe 403", async () => {
    const svc = buildService([PARENT_ONLY]);
    await expect(svc.list(user(["SCHOOL"]))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.getFile(user(["SCHOOL"]), PARENT_ONLY.id)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("SECRETARY ve activos pero no inactivos", async () => {
    const svc = buildService([PARENT_ONLY, INACTIVE]);
    const rows = await svc.list(user(["SECRETARY"]));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(PARENT_ONLY.id);
    await expect(svc.getFile(user(["SECRETARY"]), INACTIVE.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rechaza audience vacía al crear", async () => {
    const svc = buildService([]);
    await expect(
      svc.create(user(["ADMIN"]), {
        title: "T",
        fileName: "a.pdf",
        mimeType: "application/pdf",
        dataUrl: "data:application/pdf;base64,abc",
        audience: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rechaza audience con SCHOOL", async () => {
    const svc = buildService([]);
    await expect(
      svc.create(user(["ADMIN"]), {
        title: "T",
        fileName: "a.pdf",
        mimeType: "application/pdf",
        dataUrl: "data:application/pdf;base64,abc",
        audience: [RoleKey.SCHOOL],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
