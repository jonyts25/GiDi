import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { FollowUpsService } from "./followups.service";
import { CreateFollowUpDto } from "./dto/create-followup.dto";
import { UpdateFollowUpDto } from "./dto/update-followup.dto";
import { ReplaceObjectivesDto } from "./dto/replace-objectives.dto";
import { CreateFollowUpSessionDto } from "./dto/create-followup-session.dto";
import { UpsertMarkDto } from "./dto/upsert-mark.dto";
import { UpdateObjectiveNotesDto } from "./dto/update-objective-notes.dto";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";

@Controller()
@UseGuards(JwtGuard)
export class FollowUpsController {
  constructor(private service: FollowUpsService) {}

  @Get("/patients/:patientId/followups")
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

  @Post("/followups")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFollowUpDto) {
    return this.service.createOrGet(user, dto);
  }

  @Get("/followups/:id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.get(user, id);
  }

  @Get("/followups/:id/report")
  report(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.getReport(user, id);
  }

  @Patch("/followups/:id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateFollowUpDto) {
    return this.service.update(user, id, dto);
  }

  @Post("/followups/:id/objectives")
  replaceObjectives(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ReplaceObjectivesDto) {
    return this.service.replaceObjectives(user, id, dto);
  }

  @Patch("/followups/:id/objective-notes")
  updateObjectiveNotes(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateObjectiveNotesDto,
  ) {
    return this.service.updateObjectiveNotes(user, id, dto);
  }

  @Post("/followups/:id/sessions")
  createSession(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: CreateFollowUpSessionDto,
  ) {
    return this.service.createSession(user, id, dto);
  }

  @Delete("/followups/:id/sessions/:sessionId")
  deleteSession(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("sessionId") sessionId: string,
  ) {
    return this.service.deleteSession(user, id, sessionId);
  }

  @Post("/followups/:id/sessions/:sessionId/marks")
  upsertMark(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: UpsertMarkDto,
  ) {
    return this.service.upsertMark(user, id, sessionId, dto);
  }
}
