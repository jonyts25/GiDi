import { IsString, MaxLength } from "class-validator";

export class UploadReceiptDto {
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @IsString()
  dataUrl!: string;
}
