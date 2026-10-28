import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";
import { CoordinatorService } from "./coordinator.service";

@Controller("coordinator")
@UseGuards(JwtGuard)
export class CoordinatorController {
  constructor(private service: CoordinatorService) {}

  @Get("team")
  team(@CurrentUser() user: AuthUser) {
    return this.service.listTeam(user);
  }
}
