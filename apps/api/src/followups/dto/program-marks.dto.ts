import { ArrayMaxSize, IsArray, IsOptional, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class ProgramMarkItemDto {
  @IsUUID()
  followUpId!: string;

  @IsUUID()
  sessionId!: string;

  @IsUUID()
  objectiveId!: string;

  /** Escala 0–4, código de asistencia (p. ej. "V") o null para borrar la celda. */
  @IsOptional()
  value?: string | number | null;
}

export class ProgramMarksDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ProgramMarkItemDto)
  marks!: ProgramMarkItemDto[];
}
