import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { GuardianRelationship } from "@prisma/client";

export class SetGuardianMetaDto {
  @IsOptional()
  @IsEnum(GuardianRelationship)
  relationship?: GuardianRelationship;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
