import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";
import { CenterDocumentsService } from "./center-documents.service";

@UseGuards(JwtGuard, RolesGuard)
@Controller("center-documents")
export class CenterDocumentsController {
  constructor(private svc: CenterDocumentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.svc.list(user);
  }

  @Get(":id/file")
  file(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.svc.getFile(user, id);
  }
}
