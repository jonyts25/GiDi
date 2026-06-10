import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";
import { SchoolPortalService } from "./school-portal.service";

@UseGuards(JwtGuard, RolesGuard)
@Roles("SCHOOL")
@Controller("school")
export class SchoolPortalController {
  constructor(private svc: SchoolPortalService) {}

  @Get("patients")
  list(@CurrentUser() user: AuthUser) {
    return this.svc.listMyPatients(user.sub);
  }

  @Get("patients/:id")
  getOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.svc.getPatient(user.sub, id);
  }
}
