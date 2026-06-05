import { IsString } from "class-validator";

export class SetSchoolDto {
  @IsString()
  schoolId!: string;
}
