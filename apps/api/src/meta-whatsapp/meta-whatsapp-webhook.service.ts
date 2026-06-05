import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import { MetaWhatsappOutboundService } from "@gidi/bot";
import { PrismaService } from "../prisma.service";

const MENU_BTN_CLINICA = "gidi_menu_clinica";
const MENU_BTN_VALLARTA = "gidi_menu_vallarta";
const MENU_BTN_SAN_AGUSTIN = "gidi_menu_san_agustin";

type ParsedInbound = {
  phoneNumberId: string;
  fromWaId: string;
  messageType: string;
  textBody?: string;
  buttonId?: string;
};

/**
 * Webhook de la WhatsApp Cloud API (Meta).
 *
 * Seguridad / canal único:
 * - Solo se procesan mensajes cuyo `metadata.phone_number_id` coincide con `META_WHATSAPP_PHONE_NUMBER_ID`.
 * - Toda respuesta (texto o botones) se envía con `MetaWhatsappOutboundService` del paquete `@gidi/bot`,
 *   es decir, el mismo número oficial y `META_WHATSAPP_ACCESS_TOKEN` (nunca desde el cliente web).
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
 */
@Injectable()
export class MetaWhatsappWebhookService {
  private readonly log = new Logger(MetaWhatsappWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  verifySubscription(mode?: string, token?: string, challenge?: string): string | null {
    const verifyToken = this.config.get<string>("META_WHATSAPP_VERIFY_TOKEN") ?? "";
    if (mode === "subscribe" && token && verifyToken && token === verifyToken && challenge) {
      return challenge;
    }
    return null;
  }

  verifySignature(rawBody: Buffer, signatureHeader?: string): boolean {
    const appSecret = this.config.get<string>("META_WHATSAPP_APP_SECRET") ?? "";
    if (!appSecret) {
      this.log.warn("META_WHATSAPP_APP_SECRET no configurado; se rechazan webhooks POST");
      return false;
    }
    if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
    const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
    try {
      const a = Buffer.from(signatureHeader, "utf8");
      const b = Buffer.from(expected, "utf8");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  private outboundClient(): MetaWhatsappOutboundService | null {
    const phoneNumberId = this.config.get<string>("META_WHATSAPP_PHONE_NUMBER_ID")?.trim() ?? "";
    const accessToken = this.config.get<string>("META_WHATSAPP_ACCESS_TOKEN")?.trim() ?? "";
    const graphVersion = this.config.get<string>("META_WHATSAPP_GRAPH_VERSION")?.trim() || "v21.0";
    if (!phoneNumberId || !accessToken) {
      this.log.warn("WhatsApp outbound deshabilitado: faltan META_WHATSAPP_PHONE_NUMBER_ID o META_WHATSAPP_ACCESS_TOKEN");
      return null;
    }
    return new MetaWhatsappOutboundService({ phoneNumberId, accessToken, graphVersion });
  }

  private expectedOfficialPhoneNumberId(): string | null {
    const id = this.config.get<string>("META_WHATSAPP_PHONE_NUMBER_ID")?.trim() ?? "";
    return id.length > 0 ? id : null;
  }

  async handleWebhookPayload(payload: unknown): Promise<void> {
    const items = this.parseInboundMessages(payload);
    const officialId = this.expectedOfficialPhoneNumberId();
    const outbound = this.outboundClient();

    for (const ev of items) {
      if (officialId && ev.phoneNumberId !== officialId) {
        this.log.warn(`Ignorando evento de phone_number_id no oficial: ${ev.phoneNumberId}`);
        continue;
      }

      if (!outbound) continue;

      const selection = this.resolveMenuSelection(ev);
      const state = await this.prisma.whatsAppContactState.upsert({
        where: { waId: ev.fromWaId },
        create: { waId: ev.fromWaId, welcomeMenuShown: false },
        update: {},
      });

      if (selection) {
        const text = this.contentForSelection(selection);
        const r = await outbound.sendText({ to: ev.fromWaId, text });
        if (!r.ok) {
          this.log.warn(`Fallo envío texto (${r.status}): ${JSON.stringify(r.body)}`);
        } else {
          await this.prisma.whatsAppContactState.update({
            where: { waId: ev.fromWaId },
            data: { welcomeMenuShown: true },
          });
        }
        continue;
      }

      if (!state.welcomeMenuShown) {
        const welcome =
          this.config.get<string>("GIDI_WHATSAPP_WELCOME_BODY")?.trim() ||
          "Hola, bienvenido a GiDi. Elige una opción:";
        const r = await outbound.sendInteractiveButtons({
          to: ev.fromWaId,
          bodyText: welcome,
          buttons: [
            { id: MENU_BTN_CLINICA, title: "Asistencia clínica" },
            { id: MENU_BTN_VALLARTA, title: "GiDi Vallarta" },
            { id: MENU_BTN_SAN_AGUSTIN, title: "GiDi San Agustín" },
          ],
        });
        if (!r.ok) {
          this.log.warn(`Fallo menú interactivo (${r.status}): ${JSON.stringify(r.body)}`);
        } else {
          await this.prisma.whatsAppContactState.update({
            where: { waId: ev.fromWaId },
            data: { welcomeMenuShown: true },
          });
        }
        continue;
      }

      const hint =
        this.config.get<string>("GIDI_WHATSAPP_MENU_HINT")?.trim() ||
        "Escribe 1 (Asistencia clínica), 2 (GiDi Vallarta) o 3 (GiDi San Agustín), o usa los botones del menú anterior.";
      const r = await outbound.sendText({ to: ev.fromWaId, text: hint });
      if (!r.ok) this.log.warn(`Fallo hint (${r.status}): ${JSON.stringify(r.body)}`);
    }
  }

  private resolveMenuSelection(ev: ParsedInbound): string | null {
    if (ev.buttonId) return ev.buttonId;
    const t = (ev.textBody ?? "").trim().toLowerCase();
    if (t === "1" || t === "asistencia" || t.includes("clínica")) return MENU_BTN_CLINICA;
    if (t === "2" || t.includes("vallarta")) return MENU_BTN_VALLARTA;
    if (t === "3" || t.includes("san agust") || t.includes("agustin")) return MENU_BTN_SAN_AGUSTIN;
    return null;
  }

  private contentForSelection(selection: string): string {
    const clinica =
      this.config.get<string>("GIDI_WHATSAPP_COORDINATOR_CONTACT")?.trim() ||
      "Asistencia clínica — Coordinación médica: configura GIDI_WHATSAPP_COORDINATOR_CONTACT en el servidor.";
    const vallarta =
      this.config.get<string>("GIDI_WHATSAPP_VALLARTA_INFO")?.trim() ||
      "GiDi Vallarta — Ubicación, horarios y contacto: configura GIDI_WHATSAPP_VALLARTA_INFO.";
    const sanAgustin =
      this.config.get<string>("GIDI_WHATSAPP_SAN_AGUSTIN_INFO")?.trim() ||
      "GiDi San Agustín — Ubicación, horarios y contacto: configura GIDI_WHATSAPP_SAN_AGUSTIN_INFO.";

    switch (selection) {
      case MENU_BTN_CLINICA:
        return clinica;
      case MENU_BTN_VALLARTA:
        return vallarta;
      case MENU_BTN_SAN_AGUSTIN:
        return sanAgustin;
      default:
        return "Opción no reconocida. Escribe 1, 2 o 3.";
    }
  }

  private parseInboundMessages(payload: unknown): ParsedInbound[] {
    const out: ParsedInbound[] = [];
    const root = payload as Record<string, unknown>;
    if (!root || root.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) return out;

    for (const ent of root.entry as unknown[]) {
      const e = ent as Record<string, unknown>;
      if (!Array.isArray(e.changes)) continue;
      for (const ch of e.changes as unknown[]) {
        const c = ch as Record<string, unknown>;
        if (c.field !== "messages") continue;
        const value = c.value as Record<string, unknown> | undefined;
        if (!value || !Array.isArray(value.messages)) continue;
        const meta = value.metadata as Record<string, unknown> | undefined;
        const phoneNumberId = typeof meta?.phone_number_id === "string" ? meta.phone_number_id : "";
        for (const m of value.messages as unknown[]) {
          const msg = m as Record<string, unknown>;
          const fromWaId = typeof msg.from === "string" ? msg.from : "";
          const messageType = typeof msg.type === "string" ? msg.type : "";
          if (!fromWaId || !phoneNumberId) continue;

          if (messageType === "text") {
            const text = msg.text as Record<string, unknown> | undefined;
            out.push({
              phoneNumberId,
              fromWaId,
              messageType,
              textBody: typeof text?.body === "string" ? text.body : undefined,
            });
          } else if (messageType === "interactive") {
            const inter = msg.interactive as Record<string, unknown> | undefined;
            const br = inter?.button_reply as Record<string, unknown> | undefined;
            const id = typeof br?.id === "string" ? br.id : undefined;
            out.push({ phoneNumberId, fromWaId, messageType, buttonId: id });
          }
        }
      }
    }
    return out;
  }
}
