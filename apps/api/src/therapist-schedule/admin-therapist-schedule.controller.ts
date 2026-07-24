import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { TherapistScheduleService } from "./therapist-schedule.service";
import { ReplaceScheduleDto } from "./dto/replace-schedule.dto";

@UseGuards(JwtGuard, RolesGuard)
@Roles("ADMIN", "SECRETARY")
@Controller("admin/therapists/:id/schedule")
export class AdminTherapistScheduleController {
  constructor(private readonly svc: TherapistScheduleService) {}

  @Get()
  get(@Param("id") id: string) {
    return this.svc.getSchedule(id);
  }

  @Put()
  replace(@Param("id") id: string, @Body() dto: ReplaceScheduleDto) {
    return this.svc.replaceSchedule(id, dto);
  }
}
