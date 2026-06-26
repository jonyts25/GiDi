import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { PaymentStatus } from "@prisma/client";

export class UpsertPaymentDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  amountDue?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountPaid?: number;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
