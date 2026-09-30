import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";
import { FollowUpProgramService } from "./followup-program.service";
import {
  CreateFollowUpProgramDto,
  CreateProgramSessionDto,
  ProgramAreaRowDto,
} from "./dto/followup-program.dto";

@Controller()
@UseGuards(JwtGuard)
export class FollowUpProgramController {
  constructor(private service: FollowUpProgramService) {}

  @Get("/patients/:patientId/programs")
  listByPatient(
    @CurrentUser() user: AuthUser,
    @Param("patientId") patientId: string,
    @Query("year") year?: string,
    @Query("month") month?: string,
  ) {
    return this.service.listByPatient(
      user,
      patientId,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );
  }

  @Post("/programs")
  createOrGet(@CurrentUser() user: AuthUser, @Body() dto: CreateFollowUpProgramDto) {
    return this.service.createOrGet(user, dto);
  }

  @Get("/programs/:id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.get(user, id);
  }

  @Put("/programs/:id/rows")
  putRows(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() rows: ProgramAreaRowDto[],
  ) {
    return this.service.putRows(user, id, rows);
  }

  @Post("/programs/:id/sessions")
  addSession(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: CreateProgramSessionDto,
  ) {
    return this.service.addSession(user, id, dto.date);
  }

  @Delete("/programs/:id/sessions/:date")
  deleteSession(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("date") date: string,
  ) {
    return this.service.deleteSession(user, id, decodeURIComponent(date));
  }

  @Post("/programs/:id/copy-from-previous")
  copyFromPrevious(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.copyFromPrevious(user, id);
  }
}
