import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth-user";
import { CENTER_PAYMENT_INFO, suggestedMonthly } from "./payment-config";
import { SetBillingDto } from "./dto/set-billing.dto";
import { UpsertPaymentDto } from "./dto/upsert-payment.dto";
import { UploadReceiptDto } from "./dto/upload-receipt.dto";

const MAX_RECEIPT_BYTES = 20 * 1024 * 1024;

const paymentSelect = {
  id: true,
  periodYear: true,
  periodMonth: true,
  amountDue: true,
  amountPaid: true,
  status: true,
  paidAt: true,
  method: true,
  reference: true,
  notes: true,
  receiptName: true,
  receiptUploadedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  private isAdmin(user: AuthUser): boolean {
    return user.roles.some((r) => r === "ADMIN" || r === "SUPERADMIN");
  }

  /** Pagos solo los ven admin o el papá vinculado al paciente. */
  private async assertParentOrAdmin(user: AuthUser, patientId: string): Promise<void> {
    if (this.isAdmin(user)) return;
    if (user.roles.includes("PARENT")) {
      const link = await this.prisma.parentPatient.findFirst({
        where: { patientId, parentId: user.sub },
      });
      if (link) return;
    }
    throw new ForbiddenException("No tiene acceso a los pagos de este paciente");
  }

  /** Vista de pagos del paciente: configuración, datos de transferencia y meses. */
  async getPatientView(user: AuthUser, patientId: string) {
    await this.assertParentOrAdmin(user, patientId);

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        center: true,
        sessionsPerWeek: true,
        discountPercent: true,
      },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const payments = await this.prisma.payment.findMany({
      where: { patientId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      select: paymentSelect,
    });

    const totalPaid = payments.reduce((acc, p) => acc + p.amountPaid, 0);
    const outstanding = payments.reduce(
      (acc, p) => acc + Math.max(p.amountDue - p.amountPaid, 0),
      0,
    );

    return {
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        center: patient.center,
      },
      billing: {
        sessionsPerWeek: patient.sessionsPerWeek,
        discountPercent: patient.discountPercent ?? 0,
        suggestedMonthly: suggestedMonthly(patient.sessionsPerWeek, patient.discountPercent),
      },
      transferInfo: CENTER_PAYMENT_INFO[patient.center],
      totals: { totalPaid, outstanding },
      payments,
    };
  }

  async setBilling(patientId: string, dto: SetBillingDto) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const updated = await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        sessionsPerWeek: dto.sessionsPerWeek ?? undefined,
        discountPercent: dto.discountPercent ?? undefined,
        center: dto.center ?? undefined,
      },
      select: { id: true, sessionsPerWeek: true, discountPercent: true, center: true },
    });

    return {
      ...updated,
      suggestedMonthly: suggestedMonthly(updated.sessionsPerWeek, updated.discountPercent),
    };
  }

  /** Crea o actualiza la mensualidad de un mes (solo admin). */
  async upsertPayment(adminUserId: string, patientId: string, year: number, month: number, dto: UpsertPaymentDto) {
    if (month < 1 || month > 12) throw new BadRequestException("Mes inválido");

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, sessionsPerWeek: true, discountPercent: true },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const existing = await this.prisma.payment.findUnique({
      where: { patientId_periodYear_periodMonth: { patientId, periodYear: year, periodMonth: month } },
    });

    const defaultDue =
      suggestedMonthly(patient.sessionsPerWeek, patient.discountPercent) ?? 0;

    const data = {
      amountDue: dto.amountDue ?? existing?.amountDue ?? defaultDue,
      amountPaid: dto.amountPaid ?? existing?.amountPaid ?? 0,
      status: dto.status ?? existing?.status ?? PaymentStatus.PENDIENTE,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : existing?.paidAt ?? undefined,
      method: dto.method ?? undefined,
      reference: dto.reference ?? undefined,
      notes: dto.notes ?? undefined,
    };

    const saved = await this.prisma.payment.upsert({
      where: { patientId_periodYear_periodMonth: { patientId, periodYear: year, periodMonth: month } },
      create: {
        patientId,
        periodYear: year,
        periodMonth: month,
        amountDue: data.amountDue,
        amountPaid: data.amountPaid,
        status: data.status,
        paidAt: data.paidAt ?? null,
        method: data.method ?? null,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        createdById: adminUserId,
      },
      update: {
        amountDue: data.amountDue,
        amountPaid: data.amountPaid,
        status: data.status,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
      },
      select: paymentSelect,
    });

    return saved;
  }

  async uploadReceipt(user: AuthUser, patientId: string, year: number, month: number, dto: UploadReceiptDto) {
    await this.assertParentOrAdmin(user, patientId);
    if (month < 1 || month > 12) throw new BadRequestException("Mes inválido");

    if (!dto.dataUrl.startsWith("data:")) {
      throw new BadRequestException("Formato de archivo inválido");
    }
    const base64 = dto.dataUrl.split(",")[1] ?? "";
    const approxBytes = Math.ceil((base64.length * 3) / 4);
    if (approxBytes > MAX_RECEIPT_BYTES) {
      throw new BadRequestException("Archivo demasiado grande (máx. 20 MB).");
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, sessionsPerWeek: true, discountPercent: true },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const defaultDue = suggestedMonthly(patient.sessionsPerWeek, patient.discountPercent) ?? 0;

    const saved = await this.prisma.payment.upsert({
      where: { patientId_periodYear_periodMonth: { patientId, periodYear: year, periodMonth: month } },
      create: {
        patientId,
        periodYear: year,
        periodMonth: month,
        amountDue: defaultDue,
        receiptUrl: dto.dataUrl,
        receiptName: dto.fileName,
        receiptUploadedAt: new Date(),
      },
      update: {
        receiptUrl: dto.dataUrl,
        receiptName: dto.fileName,
        receiptUploadedAt: new Date(),
      },
      select: paymentSelect,
    });

    return saved;
  }

  async getReceipt(user: AuthUser, patientId: string, paymentId: string) {
    await this.assertParentOrAdmin(user, patientId);
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, patientId },
      select: { receiptUrl: true, receiptName: true },
    });
    if (!payment?.receiptUrl) throw new NotFoundException("Sin comprobante");
    return { dataUrl: payment.receiptUrl, fileName: payment.receiptName ?? "comprobante" };
  }

  /** Filas planas para exportar a Excel/CSV. Filtros opcionales: año, mes, sede, paciente. */
  async exportRows(filters: {
    year?: number;
    month?: number;
    center?: "SAN_AGUSTIN" | "VALLARTA";
    patientId?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.year) where.periodYear = filters.year;
    if (filters.month) where.periodMonth = filters.month;
    if (filters.center) where.patient = { center: filters.center };

    const rows = await this.prisma.payment.findMany({
      where,
      orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
      select: {
        periodYear: true,
        periodMonth: true,
        amountDue: true,
        amountPaid: true,
        status: true,
        paidAt: true,
        method: true,
        reference: true,
        notes: true,
        patient: { select: { firstName: true, lastName: true, center: true } },
      },
    });

    return rows.map((r) => ({
      paciente: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
      sede: r.patient.center === "VALLARTA" ? "Vallarta" : "San Agustín",
      anio: r.periodYear,
      mes: r.periodMonth,
      monto_a_pagar: r.amountDue,
      monto_pagado: r.amountPaid,
      saldo: Math.max(r.amountDue - r.amountPaid, 0),
      estado: r.status,
      fecha_pago: r.paidAt ? r.paidAt.toISOString().slice(0, 10) : "",
      forma_pago: r.method ?? "",
      referencia: r.reference ?? "",
      notas: r.notes ?? "",
    }));
  }

  /** Resumen de un mes para administración (control de ingresos). */
  async monthOverview(year: number, month: number) {
    const payments = await this.prisma.payment.findMany({
      where: { periodYear: year, periodMonth: month },
      orderBy: [{ status: "asc" }],
      select: {
        ...paymentSelect,
        patient: { select: { id: true, firstName: true, lastName: true, center: true } },
      },
    });

    const totalDue = payments.reduce((a, p) => a + p.amountDue, 0);
    const totalPaid = payments.reduce((a, p) => a + p.amountPaid, 0);
    const byStatus: Record<string, number> = {};
    for (const p of payments) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;

    return {
      periodYear: year,
      periodMonth: month,
      totals: {
        totalDue,
        totalPaid,
        outstanding: Math.max(totalDue - totalPaid, 0),
        count: payments.length,
        byStatus,
      },
      payments,
    };
  }
}
