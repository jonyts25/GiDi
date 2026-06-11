import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PatientDocumentCategory } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";

const MAX_BYTES = 20 * 1024 * 1024;

@Injectable()
export class PatientDocumentsService {
  constructor(private prisma: PrismaService) {}

  async list(patientId: string) {
    return this.prisma.patientDocument.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        category: true,
        fileName: true,
        mimeType: true,
        createdAt: true,
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async upload(
    user: AuthUser,
    patientId: string,
    category: PatientDocumentCategory,
    fileName: string,
    mimeType: string,
    dataUrl: string,
  ) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    if (!dataUrl.startsWith("data:")) {
      throw new BadRequestException("Formato de archivo inválido");
    }

    const base64 = dataUrl.split(",")[1] ?? "";
    const approxBytes = Math.ceil((base64.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      throw new BadRequestException("Archivo demasiado grande (máx. 20 MB). Intente una foto más pequeña o comprima el PDF.");
    }

    return this.prisma.patientDocument.create({
      data: {
        patientId,
        category,
        fileName,
        mimeType,
        dataUrl,
        uploadedById: user.sub,
      },
      select: {
        id: true,
        category: true,
        fileName: true,
        mimeType: true,
        createdAt: true,
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async getData(patientId: string, docId: string) {
    const doc = await this.prisma.patientDocument.findFirst({
      where: { id: docId, patientId },
    });
    if (!doc) throw new NotFoundException("Documento no encontrado");
    return doc;
  }

  async remove(user: AuthUser, patientId: string, docId: string, isAdmin: boolean) {
    const doc = await this.prisma.patientDocument.findFirst({
      where: { id: docId, patientId },
    });
    if (!doc) throw new NotFoundException("Documento no encontrado");
    if (!isAdmin && doc.uploadedById !== user.sub) {
      throw new BadRequestException("No puede eliminar este documento");
    }
    await this.prisma.patientDocument.delete({ where: { id: docId } });
    return { ok: true };
  }
}
