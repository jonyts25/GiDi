import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class AreasService {
  constructor(private prisma: PrismaService) {}

  listActive() {
    return this.prisma.area.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        key: true,
        name: true,
        category: true,
        sortOrder: true,
        isActive: true,
        trackingMode: true,
      },
    });
  }
}
