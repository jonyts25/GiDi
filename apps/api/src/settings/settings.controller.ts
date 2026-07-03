import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { SettingsService } from "./settings.service";
import { UpdateBrandingDto } from "./dto/update-branding.dto";

@Controller()
export class SettingsController {
  constructor(private svc: SettingsService) {}

  @Get("settings/branding")
  getBranding() {
    return this.svc.getBranding();
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @Put("admin/settings/branding")
  updateBranding(@Body() dto: UpdateBrandingDto) {
    return this.svc.updateBranding(dto);
  }
}
