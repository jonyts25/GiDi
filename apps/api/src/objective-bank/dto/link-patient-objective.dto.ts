import { IsUUID } from "class-validator";

export class LinkPatientObjectiveDto {
  @IsUUID()
  objectiveBankId: string;
}
