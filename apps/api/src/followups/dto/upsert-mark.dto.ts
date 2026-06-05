import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { FollowUpMarkCode } from "@prisma/client";

export class UpsertMarkDto {
  @IsString()
  objectiveId!: string;

  @IsOptional()
  @IsEnum(FollowUpMarkCode)
  code?: FollowUpMarkCode;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  progressScale?: number;
}
