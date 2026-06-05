import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { TherapistService } from "./therapist.service";
import { CurrentUser } from "../auth/current-user.decorator";

@UseGuards(JwtGuard, RolesGuard)
@Roles("THERAPIST")
@Controller("therapist")
export class TherapistController {
  constructor(private svc: TherapistService) {}

  // ✅ lista de pacientes del terapeuta (ya lo tenías)
  @Get("patients")
  listMyPatients(@CurrentUser() user: any) {
    return this.svc.listMyPatients(user.sub);
  }

  // ✅ detalle de paciente (nuevo)
  @Get("patients/:id")
  getPatient(@Param("id") id: string, @CurrentUser() user: any) {
    return this.svc.getMyPatient(user.sub, id);
  }
}
