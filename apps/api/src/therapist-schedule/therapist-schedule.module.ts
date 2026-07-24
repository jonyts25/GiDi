import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TherapistScheduleService } from "./therapist-schedule.service";
import { AdminTherapistScheduleController } from "./admin-therapist-schedule.controller";
import { TherapistScheduleController } from "./therapist-schedule.controller";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AdminTherapistScheduleController, TherapistScheduleController],
  providers: [TherapistScheduleService],
})
export class TherapistScheduleModule {}
