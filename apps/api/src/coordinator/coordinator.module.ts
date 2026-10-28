import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CoordinatorController } from "./coordinator.controller";
import { CoordinatorService } from "./coordinator.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CoordinatorController],
  providers: [CoordinatorService],
})
export class CoordinatorModule {}
