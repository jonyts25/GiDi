import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AdminPatientsService } from "./admin-patients.service";
import { UpdatePatientDto } from "./dto/update-patient.dto";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { AddGuardianDto } from "./dto/add-guardian.dto";
import { SetGuardianMetaDto } from "./dto/set-guardian-meta.dto";

@UseGuards(JwtGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/patients")
export class AdminPatientsController {
  constructor(private readonly svc: AdminPatientsService) {}

  // ✅ CREATE patient
  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.svc.createPatient(dto);
  }

  // ✅ FULL patient view
  @Get(":id")
  getFull(@Param("id") id: string) {
    return this.svc.getFull(id);
  }

  // ✅ UPDATE basic patient fields
  @Patch(":id")
  updatePatient(@Param("id") id: string, @Body() dto: UpdatePatientDto) {
    return this.svc.updatePatient(id, dto);
  }

  // -------- therapists assignment ----------
  @Post(":id/therapists")
  assignTherapist(@Param("id") id: string, @Body() body: { therapistId: string }) {
    return this.svc.assignTherapist(id, body.therapistId);
  }

  @Delete(":id/therapists/:therapistId")
  unassignTherapist(@Param("id") id: string, @Param("therapistId") therapistId: string) {
    return this.svc.unassignTherapist(id, therapistId);
  }

  // -------- guardians (parents) ----------
  @Post(":id/guardians")
  addGuardian(@Param("id") id: string, @Body() dto: AddGuardianDto) {
    return this.svc.addGuardian(id, dto);
  }

  @Patch(":id/guardians/:parentId")
  setGuardianMeta(
    @Param("id") id: string,
    @Param("parentId") parentId: string,
    @Body() dto: SetGuardianMetaDto
  ) {
    return this.svc.setGuardianMeta(id, parentId, dto);
  }

  @Delete(":id/guardians/:parentId")
  removeGuardian(@Param("id") id: string, @Param("parentId") parentId: string) {
    return this.svc.removeGuardian(id, parentId);
  }

  // -------- school (single active) ----------
  @Put(":id/school")
  setSchool(@Param("id") id: string, @Body() body: { schoolId: string }) {
    return this.svc.setSchool(id, body.schoolId);
  }

  @Delete(":id/school")
  clearSchool(@Param("id") id: string) {
    return this.svc.clearSchool(id);
  }
}
