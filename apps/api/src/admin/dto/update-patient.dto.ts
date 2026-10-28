import { IsEnum, IsInt, IsOptional, IsString, IsDateString, Max, Min } from "class-validator";
import { GidiCenter } from "@prisma/client";

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

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
  @IsDateString()
  lastRevaluationDate?: string | null;

  @IsOptional()
  @IsDateString()
  revaluationAlertSnoozedUntil?: string | null;

  @IsOptional()
  @IsString()
  revaluationSkipReason?: string | null;

  @IsOptional()
  @IsInt()
  @Min(2000)
  therapyStartYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  therapyStartMonth?: number;
}
