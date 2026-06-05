import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from "class-validator";
import { GuardianRelationship } from "@prisma/client";

export class AddGuardianDto {
  /** Si viene, se vincula este usuario (debe tener rol PARENT). No hace falta email ni nombre. */
  @IsOptional()
  @IsUUID("4")
  parentId?: string;

  @ValidateIf((o) => !o.parentId)
  @IsEmail()
  email?: string;

  @ValidateIf((o) => !o.parentId)
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEnum(GuardianRelationship)
  relationship?: GuardianRelationship;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
