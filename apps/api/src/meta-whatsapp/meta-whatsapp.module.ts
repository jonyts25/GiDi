import { Module } from "@nestjs/common";
import { MetaWhatsappWebhookController } from "./meta-whatsapp-webhook.controller";
import { MetaWhatsappWebhookService } from "./meta-whatsapp-webhook.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [MetaWhatsappWebhookController],
  providers: [MetaWhatsappWebhookService],
})
export class MetaWhatsappModule {}
