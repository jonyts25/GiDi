import { Controller, Get, Headers, Post, Query, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { MetaWhatsappWebhookService } from "./meta-whatsapp-webhook.service";

@Controller("webhooks/meta/whatsapp")
export class MetaWhatsappWebhookController {
  constructor(private readonly whatsapp: MetaWhatsappWebhookService) {}

  @Get()
  verify(
    @Query("hub.mode") mode: string | undefined,
    @Query("hub.verify_token") token: string | undefined,
    @Query("hub.challenge") challenge: string | undefined,
    @Res() res: Response,
  ) {
    const out = this.whatsapp.verifySubscription(mode, token, challenge);
    if (out !== null) return res.status(200).send(out);
    return res.status(403).send("Forbidden");
  }

  @Post()
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-hub-signature-256") signature: string | undefined,
    @Res() res: Response,
  ) {
    const raw = req.rawBody;
    if (!raw) return res.status(400).send("Missing raw body");

    if (!this.whatsapp.verifySignature(raw, signature)) {
      return res.status(401).send("Invalid signature");
    }

    let json: unknown;
    try {
      json = JSON.parse(raw.toString("utf8"));
    } catch {
      return res.status(400).send("Invalid JSON");
    }

    await this.whatsapp.handleWebhookPayload(json);
    return res.status(200).json({ ok: true });
  }
}
