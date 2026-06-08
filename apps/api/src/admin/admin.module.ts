import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { FollowUpsModule } from "../followups/followups.module";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { AdminPatientsController } from "./admin-patients.controller";
import { AdminPatientsService } from "./admin-patients.service";

@Module({
  imports: [AuthModule, PrismaModule, FollowUpsModule],
  controllers: [AdminController, AdminUsersController, AdminPatientsController],
  providers: [AdminUsersService, AdminPatientsService],
})
export class AdminModule {}
