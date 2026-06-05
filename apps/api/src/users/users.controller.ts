import { Controller, Get, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@UseGuards(JwtGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get("therapists")
  listTherapists() {
    return this.service.listTherapists();
  }

  @Get("parents")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  getParents() {
    return this.service.listByRole("PARENT");
  }

  @Get("schools")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  getSchools() {
    return this.service.listByRole("SCHOOL");
  }
}
