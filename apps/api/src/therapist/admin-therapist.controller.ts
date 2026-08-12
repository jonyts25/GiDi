import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { TherapistService } from "./therapist.service";

@UseGuards(JwtGuard, RolesGuard)
@Roles("ADMIN", "SECRETARY")
@Controller("admin/therapists/:id/patients")
export class AdminTherapistController {
  constructor(private readonly svc: TherapistService) {}

  @Get()
  listPatients(@Param("id") id: string) {
    return this.svc.listMyPatients(id);
  }
}
