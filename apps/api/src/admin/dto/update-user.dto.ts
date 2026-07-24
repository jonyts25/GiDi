import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";
import { RoleKey, UserStatus } from "@prisma/client";

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  // opcional: si quieres permitir cambiar roles múltiples desde UI después
  @IsOptional()
  @IsEnum(RoleKey, { each: true })
  roles?: RoleKey[];
}
