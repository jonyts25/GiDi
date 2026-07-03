import { IsIn, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

const PRESETS = ["white", "teal", "dark", "orange", "horizontal-dark"] as const;

class CustomLogoDto {
  @IsString()
  dataUrl!: string;

  @IsString()
  mimeType!: string;

  @IsString()
  fileName!: string;
}

export class UpdateBrandingDto {
  @IsOptional()
  @IsIn(PRESETS)
  preset?: (typeof PRESETS)[number];

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomLogoDto)
  customLogo?: CustomLogoDto | null;
}
