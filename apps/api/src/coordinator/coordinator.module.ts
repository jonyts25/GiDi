import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CoordinatorController } from "./coordinator.controller";
import { CoordinatorService } from "./coordinator.service";

@Module({
  imports: [PrismaModule],
  controllers: [CoordinatorController],
  providers: [CoordinatorService],
})
export class CoordinatorModule {}
