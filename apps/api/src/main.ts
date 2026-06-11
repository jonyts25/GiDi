import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { buildCorsOptions } from "./cors-options";
import { json, urlencoded } from "express";

const BODY_LIMIT = "25mb";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(json({ limit: BODY_LIMIT }));
  app.use(urlencoded({ limit: BODY_LIMIT, extended: true }));

  app.enableCors(buildCorsOptions());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const raw = process.env.PORT;
  const parsed = raw !== undefined && raw !== "" ? Number(raw) : NaN;
  const port = Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;
  await app.listen(port, "0.0.0.0");
  console.log(`✅ API listening on 0.0.0.0:${port}`);
}
bootstrap();
