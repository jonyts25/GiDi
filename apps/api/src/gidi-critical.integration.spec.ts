import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma.service";

const runIntegration = Boolean(process.env.DATABASE_URL);

(runIntegration ? describe : describe.skip)(
  "GiDi critical integration (DATABASE_URL)",
  () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await app.init();
      prisma = app.get(PrismaService);
    });

    afterAll(async () => {
      await app.close();
    });

    it("GET /health responds with ok", () => {
      return request(app.getHttpServer())
        .get("/health")
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ ok: true });
        });
    });

    it("GET / serves the public hello string", () => {
      return request(app.getHttpServer()).get("/").expect(200).expect("Hello World!");
    });

    it("Prisma reaches PostgreSQL", async () => {
      const rows = await prisma.$queryRawUnsafe<{ one: number }[]>(
        "SELECT 1::int AS one",
      );
      expect(rows[0]?.one).toBe(1);
    });
  },
);
