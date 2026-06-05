import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateFollowUpDto {
  @IsString()
  patientId!: string;

  @IsString()
  therapistId!: string;

  @IsString()
  areaId!: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @IsOptional()
  @IsString()
  generalGoal?: string;

  @IsOptional()
  @IsString()
  generalNotes?: string;

  @IsOptional()
  @IsString()
  homeWork?: string;
}
