import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RoleKey } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";
import { assertValidCenterDocumentAudience } from "./center-document-audience.validation";
import { assertValidCenterDocumentFile } from "./center-document-file.validation";
import { CreateCenterDocumentDto } from "./dto/create-center-document.dto";
import { UpdateCenterDocumentDto } from "./dto/update-center-document.dto";

const METADATA_SELECT = {
  id: true,
  title: true,
  description: true,
  fileName: true,
  mimeType: true,
  audience: true,
  sortOrder: true,
  isActive: true,
  updatedAt: true,
} as const;

const SETTINGS_KEY = "center_documents_settings";
const DEFAULT_SETTINGS = { officeStaffAccess: true };

export type CenterDocumentsSettings = {
  officeStaffAccess: boolean;
};

function isFullAdmin(roles: string[]): boolean {
  return roles.some((r) => r === "ADMIN" || r === "SUPERADMIN");
}

function isOfficeStaff(roles: string[]): boolean {
  return roles.includes("SECRETARY") || roles.includes("FINANCE");
}

function isSchoolOnlyBlocked(roles: string[]): boolean {
  if (!roles.includes("SCHOOL")) return false;
  return !roles.some((r) =>
    ["ADMIN", "SUPERADMIN", "SECRETARY", "FINANCE", "PARENT", "THERAPIST"].includes(r),
  );
}

function audienceMatchesUser(audience: RoleKey[], roles: string[]): boolean {
  return audience.some((a) => roles.includes(a));
}

@Injectable()
export class CenterDocumentsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(): Promise<CenterDocumentsSettings> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row?.value || typeof row.value !== "object") return DEFAULT_SETTINGS;
    const v = row.value as Partial<CenterDocumentsSettings>;
    return { officeStaffAccess: v.officeStaffAccess ?? DEFAULT_SETTINGS.officeStaffAccess };
  }

  async updateSettings(dto: CenterDocumentsSettings): Promise<CenterDocumentsSettings> {
    const next = { officeStaffAccess: dto.officeStaffAccess };
    await this.prisma.appSetting.upsert({
      where: { key: SETTINGS_KEY },
      create: { key: SETTINGS_KEY, value: next },
      update: { value: next },
    });
    return next;
  }

  assertCanUseCenterDocumentsApi(user: AuthUser): void {
    if (isSchoolOnlyBlocked(user.roles)) {
      throw new ForbiddenException("Los usuarios de escuela no tienen acceso a estos documentos.");
    }
  }

  private async assertOfficeStaffCanView(user: AuthUser): Promise<void> {
    if (!isOfficeStaff(user.roles) || isFullAdmin(user.roles)) return;
    const settings = await this.getSettings();
    if (!settings.officeStaffAccess) {
      throw new ForbiddenException("El acceso a documentos del centro está restringido para su perfil.");
    }
  }

  private listWhereForUser(user: AuthUser, settings: CenterDocumentsSettings) {
    if (isFullAdmin(user.roles)) {
      return {};
    }
    if (isOfficeStaff(user.roles)) {
      if (!settings.officeStaffAccess) {
        throw new ForbiddenException("El acceso a documentos del centro está restringido para su perfil.");
      }
      return { isActive: true };
    }

    const roleFilters: RoleKey[] = [];
    if (user.roles.includes("PARENT")) roleFilters.push(RoleKey.PARENT);
    if (user.roles.includes("THERAPIST")) roleFilters.push(RoleKey.THERAPIST);

    if (roleFilters.length === 0) {
      throw new ForbiddenException("No tiene acceso a documentos del centro.");
    }

    return {
      isActive: true,
      audience: { hasSome: roleFilters },
    };
  }

  async list(user: AuthUser) {
    this.assertCanUseCenterDocumentsApi(user);
    const settings = await this.getSettings();
    await this.assertOfficeStaffCanView(user);

    const where = this.listWhereForUser(user, settings);
    return this.prisma.centerDocument.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: METADATA_SELECT,
    });
  }

  private async findVisibleDocument(user: AuthUser, id: string) {
    this.assertCanUseCenterDocumentsApi(user);
    const settings = await this.getSettings();
    await this.assertOfficeStaffCanView(user);

    const doc = await this.prisma.centerDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException("Documento no encontrado");

    if (isFullAdmin(user.roles)) return doc;

    if (isOfficeStaff(user.roles) && !isFullAdmin(user.roles)) {
      if (!doc.isActive) throw new NotFoundException("Documento no encontrado");
      return doc;
    }

    if (!doc.isActive) throw new NotFoundException("Documento no encontrado");
    if (!audienceMatchesUser(doc.audience, user.roles)) {
      throw new ForbiddenException("No tiene acceso a este documento.");
    }

    return doc;
  }

  async getFile(user: AuthUser, id: string) {
    const doc = await this.findVisibleDocument(user, id);
    return { fileName: doc.fileName, mimeType: doc.mimeType, dataUrl: doc.dataUrl };
  }

  async create(user: AuthUser, dto: CreateCenterDocumentDto) {
    const audience = assertValidCenterDocumentAudience(dto.audience);
    assertValidCenterDocumentFile(dto.fileName, dto.mimeType, dto.dataUrl);

    return this.prisma.centerDocument.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        dataUrl: dto.dataUrl,
        audience,
        sortOrder: dto.sortOrder ?? 0,
        uploadedById: user.sub,
      },
      select: METADATA_SELECT,
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateCenterDocumentDto) {
    const existing = await this.prisma.centerDocument.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Documento no encontrado");

    const data: Record<string, unknown> = {};

    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.audience !== undefined) {
      data.audience = assertValidCenterDocumentAudience(dto.audience);
    }

    const replacingFile = dto.dataUrl !== undefined || dto.fileName !== undefined || dto.mimeType !== undefined;
    if (replacingFile) {
      const fileName = dto.fileName ?? existing.fileName;
      const mimeType = dto.mimeType ?? existing.mimeType;
      const dataUrl = dto.dataUrl ?? existing.dataUrl;
      if (!dto.dataUrl && (dto.fileName || dto.mimeType)) {
        throw new BadRequestException("Debe incluir el archivo al reemplazar nombre o tipo.");
      }
      assertValidCenterDocumentFile(fileName, mimeType, dataUrl);
      data.fileName = fileName;
      data.mimeType = mimeType;
      data.dataUrl = dataUrl;
      data.uploadedById = user.sub;
    }

    return this.prisma.centerDocument.update({
      where: { id },
      data,
      select: METADATA_SELECT,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.centerDocument.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Documento no encontrado");
    await this.prisma.centerDocument.delete({ where: { id } });
    return { ok: true };
  }
}
