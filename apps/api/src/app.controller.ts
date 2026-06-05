import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { AppService } from "./app.service";
import { PrismaService } from "./prisma.service";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  /** Liveness: no toca la base de datos. */
  @Get("health")
  health() {
    return { ok: true };
  }

  /** Readiness: comprueba conexión a Postgres (pooler / Supabase). */
  @Get("health/ready")
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, db: true };
    } catch {
      throw new ServiceUnavailableException("database unreachable");
    }
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

