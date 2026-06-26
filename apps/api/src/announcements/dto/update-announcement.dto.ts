import { ArrayUnique, IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { RoleKey } from "@prisma/client";

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(RoleKey, { each: true })
  audience?: RoleKey[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
