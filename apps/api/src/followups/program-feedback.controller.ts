import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";
import { ProgramFeedbackService } from "./program-feedback.service";
import { CreateProgramFeedbackDto, UpdateProgramFeedbackDto } from "./dto/program-feedback.dto";

@Controller()
@UseGuards(JwtGuard)
export class ProgramFeedbackController {
  constructor(private service: ProgramFeedbackService) {}

  @Get("/feedback/unread")
  listUnread(@CurrentUser() user: AuthUser) {
    return this.service.listUnreadForTherapist(user);
  }

  @Get("/programs/:id/feedback")
  list(@CurrentUser() user: AuthUser, @Param("id") programId: string) {
    return this.service.listForProgram(user, programId);
  }

  @Post("/programs/:id/feedback")
  create(
    @CurrentUser() user: AuthUser,
    @Param("id") programId: string,
    @Body() dto: CreateProgramFeedbackDto,
  ) {
    return this.service.create(user, programId, dto);
  }

  @Patch("/feedback/:id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateProgramFeedbackDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete("/feedback/:id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.delete(user, id);
  }
}
