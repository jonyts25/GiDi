import { Body, Controller, Delete, Param, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { ObjectiveBankService } from "./objective-bank.service";
import { CreateObjectiveBankDto } from "./dto/create-objective-bank.dto";

@UseGuards(JwtGuard, RolesGuard)
@Roles("ADMIN", "SUPERADMIN")
@Controller("admin/objective-bank")
export class AdminObjectiveBankController {
  constructor(private readonly objectives: ObjectiveBankService) {}

  /** Crear objetivo de catálogo; por defecto `isPublic: true` para compartir con terapeutas. */
  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateObjectiveBankDto) {
    return this.objectives.createForAdmin(user.sub, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.objectives.deleteForAdmin(id);
  }
}
