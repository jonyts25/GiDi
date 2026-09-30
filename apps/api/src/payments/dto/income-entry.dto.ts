import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { GidiCenter, IncomeConcept, IncomeMethod } from "@prisma/client";

export class CreateIncomeEntryDto {
  @IsOptional()
  @IsEnum(GidiCenter)
  center?: GidiCenter;

  @IsString()
  receivedAt!: string;

  @IsEnum(IncomeConcept)
  concept!: IncomeConcept;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  payerName?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number;

  @IsEnum(IncomeMethod)
  method!: IncomeMethod;

  @IsOptional()
  @IsBoolean()
  invoiced?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateIncomeEntryDto {
  @IsOptional()
  @IsEnum(GidiCenter)
  center?: GidiCenter;

  @IsOptional()
  @IsString()
  receivedAt?: string;

  @IsOptional()
  @IsEnum(IncomeConcept)
  concept?: IncomeConcept;

  @IsOptional()
  @IsUUID()
  patientId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  payerName?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number | null;

  @IsOptional()
  @IsEnum(IncomeMethod)
  method?: IncomeMethod;

  @IsOptional()
  @IsBoolean()
  invoiced?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class SetBillingNotesDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  billingNotes?: string | null;
}
