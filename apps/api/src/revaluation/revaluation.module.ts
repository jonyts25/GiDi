import { Module } from "@nestjs/common";
import { RevaluationAlertsService } from "./revaluation-alerts.service";
import { RevaluationController } from "./revaluation.controller";

@Module({
  controllers: [RevaluationController],
  providers: [RevaluationAlertsService],
  exports: [RevaluationAlertsService],
})
export class RevaluationModule {}
