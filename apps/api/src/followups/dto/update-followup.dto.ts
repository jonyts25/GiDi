import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { FollowUpStatus } from "@prisma/client";

export class UpdateFollowUpDto {
  @IsOptional()
  @IsString()
  generalGoal?: string;

  @IsOptional()
  @IsString()
  generalNotes?: string;

  @IsOptional()
  @IsString()
  homeWork?: string;

  @IsOptional()
  @IsString()
  parentComments?: string;

  @IsOptional()
  @IsString()
  observationsAuthor?: string;

  @IsOptional()
  @IsEnum(FollowUpStatus)
  status?: FollowUpStatus;

  @IsOptional()
  @IsBoolean()
  visibleToParent?: boolean;

  @IsOptional()
  @IsBoolean()
  visibleToTherapist?: boolean;

  @IsOptional()
  @IsBoolean()
  visibleToSchool?: boolean;
}
