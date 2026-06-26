import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { GidiCenter } from "@prisma/client";

export class SetBillingDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  sessionsPerWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsEnum(GidiCenter)
  center?: GidiCenter;
}
