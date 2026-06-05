import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { PatientsService } from "./patients.service";
import { UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { Param } from "@nestjs/common";

@UseGuards(JwtGuard)

@Controller("patients")
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  @Post()
  create(@Body() body) {
    return this.service.create(body);
  }
  @Get(":id")
  findOne(@Param("id") id: string) {

    return this.service.findOne(id);
}
@Post(":id/assign-therapist")
assignTherapist(
  @Param("id") id: string,
  @Body() body: { therapistId: string },
) {
  return this.service.assignTherapist(id, body.therapistId);
}
  @Get()
  findAll(@Req() req: any) {
    const user = req.user;
    const roles: string[] = user.roles ?? [];

    if (user.roles.includes("THERAPIST")) {
      return this.service.findForTherapist(user.sub);
    }

    return this.service.findAll();
  }
}
