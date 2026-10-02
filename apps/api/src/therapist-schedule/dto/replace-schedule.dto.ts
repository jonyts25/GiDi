import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ScheduleSlotDto {
  /** 0 = Lunes … 5 = Sábado */
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @MaxLength(20)
  startTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  endTime?: string | null;

  @IsOptional()
  @ValidateIf((o: ScheduleSlotDto) => !o.isFree)
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsUUID()
  patientId?: string | null;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;
}

export class ReplaceScheduleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  slots: ScheduleSlotDto[];
}
