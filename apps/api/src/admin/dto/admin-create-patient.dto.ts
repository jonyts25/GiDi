import { IsArray, IsEmail, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class PatientDto {
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsString() notes?: string;
}

class GuardianDto {
  @IsString() fullName!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() relationship?: string; // MOTHER/FATHER/TUTOR/OTHER
  @IsOptional() isPrimary?: boolean;
  @IsOptional() @IsString() notes?: string;
}

class SchoolDto {
  @IsString() fullName!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() notes?: string;
}

export class AdminCreatePatientDto {
  @ValidateNested()
  @Type(() => PatientDto)
  patient!: PatientDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuardianDto)
  guardians?: GuardianDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  therapistIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SchoolDto)
  school?: SchoolDto;
}
