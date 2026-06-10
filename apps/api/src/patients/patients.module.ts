import { Module } from "@nestjs/common";
import { PatientsController } from "./patients.controller";
import { PatientsService } from "./patients.service";
import { PatientDocumentsController } from "./patient-documents.controller";
import { PatientDocumentsService } from "./patient-documents.service";
import { AuthModule } from "../auth/auth.module";
import { FollowUpsModule } from "../followups/followups.module";

@Module({
  imports: [AuthModule, FollowUpsModule],
  controllers: [PatientsController, PatientDocumentsController],
  providers: [PatientsService, PatientDocumentsService],
})
export class PatientsModule {}
