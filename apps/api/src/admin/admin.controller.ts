import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from "@nestjs/common";
import { AdminUsersService } from "./admin-users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { RoleKey } from "@prisma/client";
import { JwtGuard } from "../auth/jwt.guard";

@UseGuards(JwtGuard)
@Controller("admin")
export class AdminController {
  constructor(private adminUsers: AdminUsersService) {}

  @Get("users")
  listUsers(@Query("role") role: RoleKey) {
    return this.adminUsers.listByRole(role);
  }

  @Post("users")
  createUser(@Body() dto: CreateUserDto) {
    return this.adminUsers.create(dto);
  }

  @Get("users/:id")
  getUser(@Param("id") id: string) {
    return this.adminUsers.get(id);
  }

  @Patch("users/:id")
  updateUser(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.adminUsers.update(id, dto);
  }
}
