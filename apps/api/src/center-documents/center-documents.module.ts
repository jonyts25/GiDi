import { Module } from "@nestjs/common";
import { CenterDocumentsController } from "./center-documents.controller";
import { AdminCenterDocumentsController } from "./admin-center-documents.controller";
import { CenterDocumentsService } from "./center-documents.service";

@Module({
  controllers: [CenterDocumentsController, AdminCenterDocumentsController],
  providers: [CenterDocumentsService],
  exports: [CenterDocumentsService],
})
export class CenterDocumentsModule {}
