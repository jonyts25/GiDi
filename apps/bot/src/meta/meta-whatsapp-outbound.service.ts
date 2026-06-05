import type { MetaWhatsappEnv } from "./meta-env";

export type SendTextMessageInput = {
  /** Número en formato internacional sin + (ej. 5215512345678) */
  to: string;
  text: string;
};

export type InteractiveButton = { id: string; title: string };

export type SendInteractiveButtonsInput = {
  to: string;
  bodyText: string;
  /** Máximo 3 botones (límite de Meta para type `button`) */
  buttons: InteractiveButton[];
};

/**
 * Cliente mínimo para envío de texto vía WhatsApp Cloud API (Meta).
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 */
export class MetaWhatsappOutboundService {
  constructor(private readonly env: MetaWhatsappEnv) {}

  private async postMessages(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; body: unknown }> {
    const url = `https://graph.facebook.com/${this.env.graphVersion}/${this.env.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.env.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const parsed = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body: parsed };
  }

  async sendText(input: SendTextMessageInput): Promise<{ ok: boolean; status: number; body: unknown }> {
    return this.postMessages({
      messaging_product: "whatsapp",
      to: input.to.replace(/^\+/, ""),
      type: "text",
      text: { preview_url: false, body: input.text },
    });
  }

  /**
   * Mensaje interactivo con botones de respuesta rápida.
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-reply-buttons-messages
   */
  async sendInteractiveButtons(
    input: SendInteractiveButtonsInput,
  ): Promise<{ ok: boolean; status: number; body: unknown }> {
    if (input.buttons.length === 0 || input.buttons.length > 3) {
      throw new Error("Meta interactive buttons: se requieren entre 1 y 3 botones");
    }
    return this.postMessages({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.to.replace(/^\+/, ""),
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: input.bodyText },
        action: {
          buttons: input.buttons.map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.title.slice(0, 20) },
          })),
        },
      },
    });
  }
}
