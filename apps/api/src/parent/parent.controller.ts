import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { ParentService } from "./parent.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { FollowUpsService } from "../followups/followups.service";
import { AuthUser } from "../auth/auth-user";

@UseGuards(JwtGuard, RolesGuard)
@Roles("PARENT")
@Controller("parent")
export class ParentController {
  constructor(
    private svc: ParentService,
    private followUps: FollowUpsService,
  ) {}

  @Get("patients")
  listMyPatients(@CurrentUser() user: any) {
    return this.svc.listMyPatients(user.sub);
  }

  @Get("patients/:id")
  getMyPatient(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.svc.getMyPatient(user.sub, id);
  }

  @Get("patients/:id/followups/summary")
  followUpSummary(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Query("year") year?: string,
    @Query("month") month?: string,
  ) {
    return this.followUps.getParentSummary(
      user,
      id,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );
  }
}
