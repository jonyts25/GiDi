import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { TherapistScheduleService } from "./therapist-schedule.service";

@UseGuards(JwtGuard, RolesGuard)
@Roles("THERAPIST")
@Controller("therapist/schedule")
export class TherapistScheduleController {
  constructor(private readonly svc: TherapistScheduleService) {}

  /** La terapeuta ve su propio horario (solo lectura). */
  @Get()
  mySchedule(@CurrentUser() user: { sub: string }) {
    return this.svc.getSchedule(user.sub);
  }
}
