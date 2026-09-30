import { IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class CreateFollowUpProgramDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  therapistId!: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;
}

export class ProgramObjectiveRowDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  activities?: string | null;
}

export class ProgramAreaRowDto {
  @IsUUID()
  areaId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramObjectiveRowDto)
  objectives!: ProgramObjectiveRowDto[];
}

export class PutProgramRowsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramAreaRowDto)
  rows!: ProgramAreaRowDto[];
}

export class CreateProgramSessionDto {
  @IsString()
  date!: string;
}
