import { Controller, Get, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@UseGuards(JwtGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get("therapists")
  @Roles("ADMIN", "SUPERADMIN", "SECRETARY", "THERAPIST", "COORDINATOR")
  listTherapists() {
    return this.service.listTherapists();
  }

  @Get("parents")
  @Roles("ADMIN", "SECRETARY")
  getParents() {
    return this.service.listByRole("PARENT");
  }

  @Get("schools")
  @Roles("ADMIN", "SECRETARY")
  getSchools() {
    return this.service.listByRole("SCHOOL");
  }
}
