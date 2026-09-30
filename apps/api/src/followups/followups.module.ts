import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { FollowUpsController } from "./followups.controller";
import { TherapistFollowUpsController } from "./therapist-followups.controller";
import { FollowUpProgramController } from "./followup-program.controller";
import { FollowUpsService } from "./followups.service";
import { FollowUpProgramService } from "./followup-program.service";
import { FollowUpAccessService } from "./followup-access.service";
import { AuthModule } from "src/auth/auth.module";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FollowUpsController, TherapistFollowUpsController, FollowUpProgramController],
  providers: [FollowUpsService, FollowUpProgramService, FollowUpAccessService, PrismaService],
  exports: [FollowUpsService, FollowUpProgramService, FollowUpAccessService],
})
export class FollowUpsModule {}
