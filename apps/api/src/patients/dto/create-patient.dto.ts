import { GidiCenter, GuardianRelationship } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class GuardianInputDto {
  @IsOptional()
  @IsUUID("4")
  existingParentId?: string;

  @ValidateIf((o) => !o.existingParentId)
  @IsEmail()
  email?: string;

  @ValidateIf((o) => !o.existingParentId)
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(GuardianRelationship)
  relationship?: GuardianRelationship;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class ParentInputDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

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

export class SchoolInputDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(GidiCenter)
  center?: GidiCenter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sessionsPerWeek?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discountPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  agreedMonthlyAmount?: number | null;

  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  therapistIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuardianInputDto)
  guardians?: GuardianInputDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ParentInputDto)
  parent?: ParentInputDto;

  @IsOptional()
  @IsUUID("4")
  schoolId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SchoolInputDto)
  school?: SchoolInputDto;
}
