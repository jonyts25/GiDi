import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
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

  @IsString()
  @MaxLength(200)
  label: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
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
