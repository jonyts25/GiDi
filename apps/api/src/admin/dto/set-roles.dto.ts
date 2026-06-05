import { IsArray, IsString } from "class-validator";

export class SetRolesDto {
  @IsArray()
  @IsString({ each: true })
  roles!: string[];
}
