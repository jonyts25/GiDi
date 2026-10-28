import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma.service";

describe("AppModule bootstrap", () => {
  it("compiles without database (Prisma mocked)", async () => {
    const prismaMock = {
      onModuleInit: jest.fn().mockResolvedValue(undefined),
      onModuleDestroy: jest.fn().mockResolvedValue(undefined),
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    await moduleFixture.close();
  });
});
