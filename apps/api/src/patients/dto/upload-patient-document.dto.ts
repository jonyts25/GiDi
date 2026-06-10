import { IsEnum, IsString, MaxLength } from "class-validator";
import { PatientDocumentCategory } from "@prisma/client";

export class UploadPatientDocumentDto {
  @IsEnum(PatientDocumentCategory)
  category!: PatientDocumentCategory;

  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @IsString()
  dataUrl!: string;
}
