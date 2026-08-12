import { Module } from "@nestjs/common";
import { TherapistController } from "./therapist.controller";
import { AdminTherapistController } from "./admin-therapist.controller";
import { TherapistService } from "./therapist.service";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PatientsModule } from "../patients/patients.module";

@Module({
  imports: [AuthModule, PrismaModule, PatientsModule],
  controllers: [TherapistController, AdminTherapistController],
  providers: [TherapistService],
})
export class TherapistModule {}
