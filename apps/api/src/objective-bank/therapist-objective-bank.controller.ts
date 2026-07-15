import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { ObjectiveBankService } from "./objective-bank.service";
import { CreateObjectiveBankDto } from "./dto/create-objective-bank.dto";
import { UpdateObjectiveBankDto } from "./dto/update-objective-bank.dto";

@UseGuards(JwtGuard, RolesGuard)
@Roles("THERAPIST", "ADMIN", "SUPERADMIN", "SECRETARY")
@Controller("therapist/objective-bank")
export class TherapistObjectiveBankController {
  constructor(private readonly objectives: ObjectiveBankService) {}

  /** Banco: objetivos propios + públicos (admin / catálogo compartido). */
  @Get()
  list(@CurrentUser() user: { sub: string }, @Query("areaId") areaId?: string) {
    return this.objectives.listTherapistBank(user.sub, areaId);
  }

  @Post()
  @Roles("THERAPIST", "ADMIN", "SUPERADMIN")
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateObjectiveBankDto) {
    return this.objectives.createForTherapist(user.sub, dto);
  }

  @Patch(":id")
  @Roles("THERAPIST", "ADMIN", "SUPERADMIN")
  update(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Body() dto: UpdateObjectiveBankDto,
  ) {
    return this.objectives.updateForTherapist(user.sub, id, dto);
  }
}
