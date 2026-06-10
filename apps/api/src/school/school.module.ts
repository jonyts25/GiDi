import { Module } from "@nestjs/common";
import { SchoolPortalController } from "./school-portal.controller";
import { SchoolPortalService } from "./school-portal.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [SchoolPortalController],
  providers: [SchoolPortalService],
})
export class SchoolModule {}
