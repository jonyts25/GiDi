import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { IsDateString, IsIn, IsOptional, IsString, MinLength, ValidateIf } from "class-validator";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { RevaluationAlertsService } from "./revaluation-alerts.service";

class SnoozeRevaluationDto {
  @IsOptional()
  @IsIn([6, 12])
  months?: 6 | 12;

  @ValidateIf((o) => !o.months)
  @IsDateString()
  until?: string;
}

class SkipRevaluationDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}

@UseGuards(JwtGuard, RolesGuard)
@Roles("ADMIN", "SECRETARY")
@Controller("admin/patients/:patientId/revaluation")
export class RevaluationController {
  constructor(private svc: RevaluationAlertsService) {}

  @Post("snooze")
  snooze(@Param("patientId") patientId: string, @Body() dto: SnoozeRevaluationDto) {
    if (dto.until) {
      return this.svc.setReminderUntil(patientId, new Date(dto.until), null);
    }
    return this.svc.snoozePatient(patientId, dto.months ?? 6);
  }

  @Post("skip")
  skip(@Param("patientId") patientId: string, @Body() dto: SkipRevaluationDto) {
    return this.svc.skipPatient(patientId, dto.reason);
  }
}
