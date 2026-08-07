import { ArrayMinSize, IsArray, IsUUID } from "class-validator";

export class BulkFollowUpReportDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  ids!: string[];
}
