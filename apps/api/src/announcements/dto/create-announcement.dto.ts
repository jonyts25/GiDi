import { ArrayUnique, IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { RoleKey } from "@prisma/client";

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  /** Roles que verán el aviso. Vacío o ausente = todos los roles. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(RoleKey, { each: true })
  audience?: RoleKey[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
