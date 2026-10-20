import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";
import { CenterDocumentsService } from "./center-documents.service";
import { CreateCenterDocumentDto } from "./dto/create-center-document.dto";
import { UpdateCenterDocumentDto } from "./dto/update-center-document.dto";
import { UpdateCenterDocumentsSettingsDto } from "./dto/update-center-documents-settings.dto";

@UseGuards(JwtGuard, RolesGuard)
@Controller("admin/center-documents")
export class AdminCenterDocumentsController {
  constructor(private svc: CenterDocumentsService) {}

  @Get("settings")
  @Roles("ADMIN", "SUPERADMIN")
  getSettings() {
    return this.svc.getSettings();
  }

  @Patch("settings")
  @Roles("ADMIN", "SUPERADMIN")
  updateSettings(@Body() dto: UpdateCenterDocumentsSettingsDto) {
    return this.svc.updateSettings({ officeStaffAccess: dto.officeStaffAccess });
  }

  @Post()
  @Roles("ADMIN", "SUPERADMIN")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCenterDocumentDto) {
    return this.svc.create(user, dto);
  }

  @Patch(":id")
  @Roles("ADMIN", "SUPERADMIN")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateCenterDocumentDto) {
    return this.svc.update(user, id, dto);
  }

  @Delete(":id")
  @Roles("ADMIN", "SUPERADMIN")
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }
}
