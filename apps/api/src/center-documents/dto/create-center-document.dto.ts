import { ArrayNotEmpty, IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { RoleKey } from "@prisma/client";

export class CreateCenterDocumentDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @IsString()
  dataUrl!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(RoleKey, { each: true })
  audience!: RoleKey[];

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
