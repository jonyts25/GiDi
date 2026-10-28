/** Mock vacío para Jest — evita cargar puppeteer/whatsapp-web.js en tests de arranque. */
export class Client {
  on(_event: string, _handler: (...args: unknown[]) => void): this {
    return this;
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  destroy(): Promise<void> {
    return Promise.resolve();
  }
}

export class LocalAuth {}
