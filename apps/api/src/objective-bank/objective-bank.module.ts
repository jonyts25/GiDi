import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ObjectiveBankService } from "./objective-bank.service";
import { TherapistObjectiveBankController } from "./therapist-objective-bank.controller";
import { AdminObjectiveBankController } from "./admin-objective-bank.controller";
import { PatientObjectivesController } from "./patient-objectives.controller";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TherapistObjectiveBankController, AdminObjectiveBankController, PatientObjectivesController],
  providers: [ObjectiveBankService],
  exports: [ObjectiveBankService],
})
export class ObjectiveBankModule {}
