import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth-user";
import { PatientDocumentsService } from "./patient-documents.service";
import { UploadPatientDocumentDto } from "./dto/upload-patient-document.dto";
import { FollowUpAccessService } from "../followups/followup-access.service";

@UseGuards(JwtGuard, RolesGuard)
@Controller("patients/:patientId/documents")
export class PatientDocumentsController {
  constructor(
    private svc: PatientDocumentsService,
    private access: FollowUpAccessService,
  ) {}

  @Get()
  @Roles("ADMIN", "THERAPIST", "PARENT", "SCHOOL")
  async list(@CurrentUser() user: AuthUser, @Param("patientId") patientId: string) {
    await this.access.assertCanViewPatient(user, patientId);
    return this.svc.list(patientId);
  }

  @Post()
  @Roles("ADMIN", "THERAPIST", "PARENT")
  async upload(
    @CurrentUser() user: AuthUser,
    @Param("patientId") patientId: string,
    @Body() dto: UploadPatientDocumentDto,
  ) {
    await this.access.assertCanViewPatient(user, patientId);
    return this.svc.upload(user, patientId, dto.category, dto.fileName, dto.mimeType, dto.dataUrl);
  }

  @Get(":docId/file")
  @Roles("ADMIN", "THERAPIST", "PARENT", "SCHOOL")
  async file(
    @CurrentUser() user: AuthUser,
    @Param("patientId") patientId: string,
    @Param("docId") docId: string,
  ) {
    await this.access.assertCanViewPatient(user, patientId);
    const doc = await this.svc.getData(patientId, docId);
    return { dataUrl: doc.dataUrl, mimeType: doc.mimeType, fileName: doc.fileName };
  }

  @Delete(":docId")
  @Roles("ADMIN", "THERAPIST", "PARENT")
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("patientId") patientId: string,
    @Param("docId") docId: string,
  ) {
    await this.access.assertCanViewPatient(user, patientId);
    return this.svc.remove(user, patientId, docId, this.access.isAdmin(user));
  }
}
