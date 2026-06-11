import { Module } from "@nestjs/common";
import { ParentController } from "./parent.controller";
import { ParentService } from "./parent.service";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { FollowUpsModule } from "../followups/followups.module";
import { PatientsModule } from "../patients/patients.module";

@Module({
  imports: [AuthModule, PrismaModule, FollowUpsModule, PatientsModule],
  controllers: [ParentController],
  providers: [ParentService],
})
export class ParentModule {}
