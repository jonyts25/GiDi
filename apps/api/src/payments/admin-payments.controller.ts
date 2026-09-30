import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { IncomeConcept } from "@prisma/client";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";
import { PaymentsService } from "./payments.service";
import { IncomeService } from "./income.service";
import { SetBillingDto } from "./dto/set-billing.dto";
import { UpsertPaymentDto } from "./dto/upsert-payment.dto";
import {
  CreateIncomeEntryDto,
  SetBillingNotesDto,
  UpdateIncomeEntryDto,
} from "./dto/income-entry.dto";

@UseGuards(JwtGuard, RolesGuard)
@Controller("admin")
export class AdminPaymentsController {
  constructor(
    private svc: PaymentsService,
    private income: IncomeService,
  ) {}

  @Patch("patients/:patientId/billing")
  @Roles("ADMIN", "SECRETARY")
  setBilling(@Param("patientId") patientId: string, @Body() dto: SetBillingDto) {
    return this.svc.setBilling(patientId, dto);
  }

  @Patch("patients/:patientId/billing-notes")
  @Roles("ADMIN", "SECRETARY")
  setBillingNotes(@Param("patientId") patientId: string, @Body() dto: SetBillingNotesDto) {
    return this.income.setBillingNotes(patientId, dto.billingNotes);
  }

  @Put("patients/:patientId/payments/:year/:month")
  @Roles("ADMIN", "SECRETARY")
  upsertPayment(
    @CurrentUser() user: AuthUser,
    @Param("patientId") patientId: string,
    @Param("year") year: string,
    @Param("month") month: string,
    @Body() dto: UpsertPaymentDto,
  ) {
    return this.svc.upsertPayment(user.sub, patientId, Number(year), Number(month), dto);
  }

  @Get("income")
  @Roles("ADMIN", "SECRETARY")
  listIncome(
    @Query("center") center: string,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("concept") concept: string,
    @Query("patientId") patientId: string,
  ) {
    return this.income.list({
      center: center === "SAN_AGUSTIN" || center === "VALLARTA" || center === "COLEGIOS" ? center : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      concept: this.parseConcept(concept),
      patientId: patientId || undefined,
    });
  }

  @Post("income")
  @Roles("ADMIN", "SECRETARY")
  createIncome(@CurrentUser() user: AuthUser, @Body() dto: CreateIncomeEntryDto) {
    return this.income.create(user.sub, dto);
  }

  @Patch("income/:id")
  @Roles("ADMIN", "SECRETARY")
  updateIncome(@Param("id") id: string, @Body() dto: UpdateIncomeEntryDto) {
    return this.income.update(id, dto);
  }

  @Delete("income/:id")
  @Roles("ADMIN")
  deleteIncome(@Param("id") id: string) {
    return this.income.delete(id);
  }

  @Get("payments/month-sheet")
  @Roles("ADMIN", "SECRETARY")
  monthSheet(
    @Query("center") center: string,
    @Query("year") year: string,
    @Query("month") month: string,
  ) {
    const now = new Date();
    return this.income.monthSheet(
      year ? Number(year) : now.getFullYear(),
      month ? Number(month) : now.getMonth() + 1,
      center === "SAN_AGUSTIN" || center === "VALLARTA" || center === "COLEGIOS" ? center : undefined,
    );
  }

  @Get("payments/export")
  @Roles("ADMIN")
  exportRows(
    @Query("year") year: string,
    @Query("month") month: string,
    @Query("center") center: string,
    @Query("patientId") patientId: string,
  ) {
    return this.svc.exportRows({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      center:
        center === "SAN_AGUSTIN" || center === "VALLARTA" || center === "COLEGIOS"
          ? center
          : undefined,
      patientId: patientId || undefined,
    });
  }

  @Get("payments")
  @Roles("ADMIN")
  monthOverview(
    @Query("year") year: string,
    @Query("month") month: string,
    @Query("center") center: string,
  ) {
    const now = new Date();
    return this.svc.monthOverview(
      year ? Number(year) : now.getFullYear(),
      month ? Number(month) : now.getMonth() + 1,
      center === "SAN_AGUSTIN" || center === "VALLARTA" || center === "COLEGIOS" ? center : undefined,
    );
  }

  private parseConcept(value: string): IncomeConcept | undefined {
    const allowed: IncomeConcept[] = [
      "MENSUALIDAD",
      "EVALUACION",
      "REVALORACION",
      "SESION_INDIVIDUAL",
      "VISITA_ESCUELA",
      "PROTEINA",
      "OTRO",
    ];
    return allowed.includes(value as IncomeConcept) ? (value as IncomeConcept) : undefined;
  }
}
