import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RevaluationAlertsService } from "./revaluation-alerts.service";
import { RevaluationController } from "./revaluation.controller";

@Module({
  imports: [AuthModule],
  controllers: [RevaluationController],
  providers: [RevaluationAlertsService],
  exports: [RevaluationAlertsService],
})
export class RevaluationModule {}
