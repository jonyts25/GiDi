import "dotenv/config";

export type MetaWhatsappEnv = {
  phoneNumberId: string;
  accessToken: string;
  graphVersion: string;
};

/** Variables para mensajes salientes (Cloud API). Los webhooks usan la API Nest (`META_WHATSAPP_*` allí). */
export function loadMetaWhatsappEnv(): MetaWhatsappEnv {
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "";
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN?.trim() ?? "";
  const graphVersion = process.env.META_WHATSAPP_GRAPH_VERSION?.trim() || "v21.0";
  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "Faltan META_WHATSAPP_PHONE_NUMBER_ID o META_WHATSAPP_ACCESS_TOKEN para envío saliente",
    );
  }
  return { phoneNumberId, accessToken, graphVersion };
}

/** Para integraciones que inyectan credenciales sin depender de `process.env`. */
export function tryLoadMetaWhatsappEnvFromProcess(): MetaWhatsappEnv | null {
  try {
    return loadMetaWhatsappEnv();
  } catch {
    return null;
  }
}
