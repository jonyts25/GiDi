import { Module } from "@nestjs/common";
import { SchoolPortalController } from "./school-portal.controller";
import { SchoolPortalService } from "./school-portal.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { PatientsModule } from "../patients/patients.module";

@Module({
  imports: [PrismaModule, AuthModule, PatientsModule],
  controllers: [SchoolPortalController],
  providers: [SchoolPortalService],
})
export class SchoolModule {}
