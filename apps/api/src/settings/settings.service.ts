import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

export type BrandingPreset = "white" | "teal" | "dark" | "orange" | "horizontal-dark";

export type BrandingSettings = {
  preset: BrandingPreset;
  customLogo: {
    dataUrl: string;
    mimeType: string;
    fileName: string;
  } | null;
};

const BRANDING_KEY = "branding";
const DEFAULT_BRANDING: BrandingSettings = {
  preset: "white",
  customLogo: null,
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getBranding(): Promise<BrandingSettings> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: BRANDING_KEY } });
    if (!row?.value || typeof row.value !== "object") return DEFAULT_BRANDING;
    const v = row.value as Partial<BrandingSettings>;
    return {
      preset: v.preset ?? DEFAULT_BRANDING.preset,
      customLogo: v.customLogo ?? null,
    };
  }

  async updateBranding(input: Partial<BrandingSettings>): Promise<BrandingSettings> {
    const current = await this.getBranding();
    const next: BrandingSettings = {
      preset: input.preset ?? current.preset,
      customLogo: input.customLogo === undefined ? current.customLogo : input.customLogo,
    };

    if (next.customLogo) {
      if (!next.customLogo.dataUrl.startsWith("data:")) {
        throw new BadRequestException("Logo inválido");
      }
      const base64 = next.customLogo.dataUrl.split(",")[1] ?? "";
      const bytes = Math.ceil((base64.length * 3) / 4);
      if (bytes > 2 * 1024 * 1024) {
        throw new BadRequestException("El logo no debe superar 2 MB");
      }
    }

    await this.prisma.appSetting.upsert({
      where: { key: BRANDING_KEY },
      create: { key: BRANDING_KEY, value: next },
      update: { value: next },
    });

    return next;
  }
}
