import { IsString } from "class-validator";

export class AssignTherapistDto {
  @IsString()
  therapistId!: string;
}
