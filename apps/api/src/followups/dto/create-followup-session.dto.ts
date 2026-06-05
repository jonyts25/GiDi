import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class CreateFollowUpSessionDto {
  @IsDateString()
  sessionDate!: string;

  @IsOptional()
  @IsUUID()
  therapistId?: string;
}
