import { Controller, Get, UseGuards } from "@nestjs/common";
import { AreasService } from "./areas.service";
import { JwtGuard } from "../auth/jwt.guard";

@Controller()
export class AreasController {
  constructor(private areas: AreasService) {}

  @UseGuards(JwtGuard)
  @Get("/areas")
  list() {
    return this.areas.listActive();
  }
}
