import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CenterDocumentsController } from "./center-documents.controller";
import { AdminCenterDocumentsController } from "./admin-center-documents.controller";
import { CenterDocumentsService } from "./center-documents.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CenterDocumentsController, AdminCenterDocumentsController],
  providers: [CenterDocumentsService],
  exports: [CenterDocumentsService],
})
export class CenterDocumentsModule {}
