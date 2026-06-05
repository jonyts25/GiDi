import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { FollowUpsController } from "./followups.controller";
import { TherapistFollowUpsController } from "./therapist-followups.controller";
import { FollowUpsService } from "./followups.service";
import { FollowUpAccessService } from "./followup-access.service";
import { AuthModule } from "src/auth/auth.module";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FollowUpsController, TherapistFollowUpsController],
  providers: [FollowUpsService, FollowUpAccessService, PrismaService],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}
