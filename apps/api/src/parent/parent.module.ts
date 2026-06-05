import { Module } from "@nestjs/common";
import { ParentController } from "./parent.controller";
import { ParentService } from "./parent.service";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { FollowUpsModule } from "../followups/followups.module";

@Module({
  imports: [AuthModule, PrismaModule, FollowUpsModule],
  controllers: [ParentController],
  providers: [ParentService],
})
export class ParentModule {}
