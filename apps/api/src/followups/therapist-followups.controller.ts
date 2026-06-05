import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { FollowUpsService } from "./followups.service";
import { AuthUser } from "../auth/auth-user";

@UseGuards(JwtGuard, RolesGuard)
@Roles("THERAPIST", "ADMIN", "SUPERADMIN")
@Controller("therapist")
export class TherapistFollowUpsController {
  constructor(private service: FollowUpsService) {}

  @Get("followups")
  listMine(
    @CurrentUser() user: AuthUser,
    @Query("year") year?: string,
    @Query("month") month?: string,
  ) {
    return this.service.listForTherapist(
      user,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );
  }
}
