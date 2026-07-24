import { IsEnum, IsInt, IsOptional, Max, Min, ValidateIf } from "class-validator";
import { GidiCenter } from "@prisma/client";

export class SetBillingDto {
  /** `null` limpia; `0` = pago por sesión; `1|2|3` = frecuencia semanal. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(0)
  @Max(7)
  sessionsPerWeek?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsEnum(GidiCenter)
  center?: GidiCenter;
}
