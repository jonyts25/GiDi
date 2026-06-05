import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { RoleKey, UserStatus } from "@prisma/client";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  fullName!: string;

  @IsEnum(RoleKey)
  role!: RoleKey; // THERAPIST | PARENT | SCHOOL | etc

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string; // si no viene, se genera
}
