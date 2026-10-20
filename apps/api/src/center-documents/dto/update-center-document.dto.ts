import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { RoleKey } from "@prisma/client";

export class UpdateCenterDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(RoleKey, { each: true })
  audience?: RoleKey[];

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @IsOptional()
  @IsString()
  dataUrl?: string;
}
