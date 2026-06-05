import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from "class-validator";

export class ReplaceObjectivesDto {
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  objectives!: string[];
}
