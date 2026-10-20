import { IsBoolean } from "class-validator";

export class UpdateCenterDocumentsSettingsDto {
  @IsBoolean()
  officeStaffAccess!: boolean;
}
