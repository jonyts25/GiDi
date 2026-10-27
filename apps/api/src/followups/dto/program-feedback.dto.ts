import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateProgramFeedbackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body!: string;
}

export class UpdateProgramFeedbackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  body!: string;
}
