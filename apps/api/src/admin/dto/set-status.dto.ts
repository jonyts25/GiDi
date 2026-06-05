import { IsString } from "class-validator";

export class SetStatusDto {
  // "ACTIVE" | "INACTIVE"
  @IsString()
  status!: string;
}
