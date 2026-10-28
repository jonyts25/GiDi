import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PatientsService } from "./patients.service";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";
import {
  hasCoordinatorRole,
  hasOfficeStaffRole,
} from "../auth/role-permissions";
import { FollowUpAccessService } from "../followups/followup-access.service";
import { CreatePatientDto } from "./dto/create-patient.dto";

@UseGuards(JwtGuard, RolesGuard)
@Controller("patients")
export class PatientsController {
  constructor(
    private readonly service: PatientsService,
    private readonly access: FollowUpAccessService,
  ) {}

  @Post()
  @Roles("ADMIN", "SUPERADMIN", "SECRETARY")
  create(@Body() body: CreatePatientDto) {
    return this.service.create(body);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    const roles = user.roles ?? [];

    if (hasOfficeStaffRole(roles)) {
      return this.service.findAll();
    }

    if (roles.includes("THERAPIST")) {
      return this.service.findForTherapist(user.sub);
    }

    if (hasCoordinatorRole(roles)) {
      return this.service.findForCoordinator(user.sub);
    }

    throw new ForbiddenException("No tiene acceso a la lista de pacientes");
  }

  @Get(":id")
  async findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.access.assertCanViewPatient(user, id);
    return this.service.findOne(id);
  }
}
