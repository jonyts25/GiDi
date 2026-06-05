import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { ObjectiveBankService } from "./objective-bank.service";
import { LinkPatientObjectiveDto } from "./dto/link-patient-objective.dto";

@UseGuards(JwtGuard, RolesGuard)
@Controller("patients")
export class PatientObjectivesController {
  constructor(private readonly objectives: ObjectiveBankService) {}

  @Get(":patientId/objectives")
  @Roles("ADMIN", "SUPERADMIN", "THERAPIST")
  list(@Param("patientId") patientId: string, @Req() req: any) {
    return this.objectives.listPatientObjectives(patientId, req.user.sub, req.user.roles ?? []);
  }

  @Post(":patientId/objectives")
  @Roles("ADMIN", "SUPERADMIN", "THERAPIST")
  link(@Param("patientId") patientId: string, @Req() req: any, @Body() dto: LinkPatientObjectiveDto) {
    return this.objectives.linkPatientObjective(patientId, dto.objectiveBankId, req.user.sub, req.user.roles ?? []);
  }
}
