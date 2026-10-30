import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CoordinatorController } from "./coordinator.controller";
import { CoordinatorService } from "./coordinator.service";
import { PatientsModule } from "../patients/patients.module";
import { FollowUpsModule } from "../followups/followups.module";

@Module({
  imports: [PrismaModule, AuthModule, PatientsModule, FollowUpsModule],
  controllers: [CoordinatorController],
  providers: [CoordinatorService],
})
export class CoordinatorModule {}
