import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class UpdateObjectiveBankDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsUUID()
  areaId?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
