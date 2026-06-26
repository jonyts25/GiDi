import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PaymentsController } from "./payments.controller";
import { AdminPaymentsController } from "./admin-payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
