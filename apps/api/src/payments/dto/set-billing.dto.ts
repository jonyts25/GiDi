import { IsInt, IsOptional, Max, Min } from "class-validator";

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
}
