import { Body, Controller, Get, Param, Patch, Put, Query, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";
import { PaymentsService } from "./payments.service";
import { SetBillingDto } from "./dto/set-billing.dto";
import { UpsertPaymentDto } from "./dto/upsert-payment.dto";

@UseGuards(JwtGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin")
export class AdminPaymentsController {
  constructor(private svc: PaymentsService) {}

  @Patch("patients/:patientId/billing")
  setBilling(@Param("patientId") patientId: string, @Body() dto: SetBillingDto) {
    return this.svc.setBilling(patientId, dto);
  }

  @Put("patients/:patientId/payments/:year/:month")
  upsertPayment(
    @CurrentUser() user: AuthUser,
    @Param("patientId") patientId: string,
    @Param("year") year: string,
    @Param("month") month: string,
    @Body() dto: UpsertPaymentDto,
  ) {
    return this.svc.upsertPayment(user.sub, patientId, Number(year), Number(month), dto);
  }

  @Get("payments/export")
  exportRows(
    @Query("year") year: string,
    @Query("month") month: string,
    @Query("center") center: string,
    @Query("patientId") patientId: string,
  ) {
    return this.svc.exportRows({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      center: center === "SAN_AGUSTIN" || center === "VALLARTA" ? center : undefined,
      patientId: patientId || undefined,
    });
  }

  @Get("payments")
  monthOverview(@Query("year") year: string, @Query("month") month: string) {
    const now = new Date();
    return this.svc.monthOverview(
      year ? Number(year) : now.getFullYear(),
      month ? Number(month) : now.getMonth() + 1,
    );
  }
}
