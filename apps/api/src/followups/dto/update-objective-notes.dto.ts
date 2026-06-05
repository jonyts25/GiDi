import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

export class ObjectiveNoteItemDto {
  @IsUUID()
  objectiveId!: string;

  @IsOptional()
  @IsString()
  monthlyNotes?: string | null;
}

export class UpdateObjectiveNotesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ObjectiveNoteItemDto)
  notes!: ObjectiveNoteItemDto[];
}
