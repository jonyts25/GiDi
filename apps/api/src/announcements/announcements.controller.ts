import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";
import { AnnouncementsService } from "./announcements.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";

@UseGuards(JwtGuard, RolesGuard)
@Controller("announcements")
export class AnnouncementsController {
  constructor(private svc: AnnouncementsService) {}

  /** Avisos activos para el usuario actual (cualquier rol autenticado). */
  @Get("active")
  active(@CurrentUser() user: AuthUser) {
    return this.svc.activeForUser(user.roles);
  }

  @Get()
  @Roles("ADMIN")
  list() {
    return this.svc.listAll();
  }

  @Post()
  @Roles("ADMIN")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAnnouncementDto) {
    return this.svc.create(user.sub, dto);
  }

  @Patch(":id")
  @Roles("ADMIN")
  update(@Param("id") id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }
}
