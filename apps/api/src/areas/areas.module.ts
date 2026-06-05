import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AreasController } from "./areas.controller";
import { AreasService } from "./areas.service";
import { AuthModule } from "src/auth/auth.module";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  imports: [ AuthModule, PrismaModule],
  controllers: [AreasController],
  providers: [AreasService, PrismaService],
  exports: [AreasService],
})
export class AreasModule {}
