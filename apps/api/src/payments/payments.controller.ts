import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";
import { PaymentsService } from "./payments.service";
import { UploadReceiptDto } from "./dto/upload-receipt.dto";

@UseGuards(JwtGuard, RolesGuard)
@Controller("patients/:patientId/payments")
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  @Get()
  @Roles("ADMIN", "PARENT")
  view(@CurrentUser() user: AuthUser, @Param("patientId") patientId: string) {
    return this.svc.getPatientView(user, patientId);
  }

  @Post(":year/:month/receipt")
  @Roles("ADMIN", "PARENT")
  uploadReceipt(
    @CurrentUser() user: AuthUser,
    @Param("patientId") patientId: string,
    @Param("year") year: string,
    @Param("month") month: string,
    @Body() dto: UploadReceiptDto,
  ) {
    return this.svc.uploadReceipt(user, patientId, Number(year), Number(month), dto);
  }

  @Get(":paymentId/receipt")
  @Roles("ADMIN", "PARENT")
  receipt(
    @CurrentUser() user: AuthUser,
    @Param("patientId") patientId: string,
    @Param("paymentId") paymentId: string,
  ) {
    return this.svc.getReceipt(user, patientId, paymentId);
  }
}
