import { Module } from "@nestjs/common";
import { TherapistController } from "./therapist.controller";
import { TherapistService } from "./therapist.service";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TherapistController],
  providers: [TherapistService],
})
export class TherapistModule {}
