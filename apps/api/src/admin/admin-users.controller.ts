import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AdminUsersService } from "./admin-users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { RoleKey } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";

@UseGuards(JwtGuard, RolesGuard)
@Roles("ADMIN", "SECRETARY")
@Controller("admin/users")
export class AdminUsersController {
  constructor(private svc: AdminUsersService) {}

  // ✅ Listar por rol (THERAPIST / PARENT / SCHOOL / etc)
  // ?status=ACTIVE filtra solo perfiles activos (usado en selectores de asignación).
  @Get("role/:role")
  listByRole(@Param("role") role: RoleKey, @Query("status") status?: string) {
    const onlyActive = (status ?? "").toUpperCase() === "ACTIVE";
    return this.svc.listByRole(role, onlyActive ? "ACTIVE" : undefined);
  }

  @Get("inactive")
  listInactive() {
    return this.svc.listInactive();
  }

  // ✅ Detalle por id (para la pantalla Editar)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.svc.get(id);
  }

  // ✅ Crear usuario
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.svc.create(dto);
  }

  @Post(":id/reset-password")
  resetPassword(@Param("id") id: string) {
    return this.svc.resetPassword(id);
  }

  // ✅ Editar usuario
  @Patch(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.svc.update(id, dto, user);
  }
}
