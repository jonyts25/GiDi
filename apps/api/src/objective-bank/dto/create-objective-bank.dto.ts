import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateObjectiveBankDto {
  @IsString()
  @MinLength(1)
  description: string;

  @IsUUID()
  areaId: string;

  /** Solo ADMIN/SUPERADMIN pueden fijar `true` en el endpoint de admin. */
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
