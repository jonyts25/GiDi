import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { RoleKey, UserStatus } from "@prisma/client";

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  // opcional: si quieres permitir cambiar roles múltiples desde UI después
  @IsOptional()
  @IsEnum(RoleKey, { each: true })
  roles?: RoleKey[];
}
