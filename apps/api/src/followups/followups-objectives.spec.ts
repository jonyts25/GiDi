import { NotFoundException } from "@nestjs/common";
import { FollowUpsService } from "./followups.service";
import { FollowUpAccessService } from "./followup-access.service";
import { PrismaService } from "../prisma.service";

const ARCHIVED_OBJECTIVE_IDX = 1000;
const FOLLOW_UP_ID = "fu-1";

type StoredObjective = {
  id: string;
  followUpId: string;
  idx: number;
  text: string;
  activities: string | null;
  _count: { marks: number };
};

function createObjectiveStore(initial: Omit<StoredObjective, "followUpId">[]) {
  const objectives = new Map<string, StoredObjective>(
    initial.map((o) => [o.id, { ...o, followUpId: FOLLOW_UP_ID }]),
  );
  let nextId = initial.length + 1;

  function assertUniqueIdx(followUpId: string, idx: number, excludeId?: string) {
    for (const obj of objectives.values()) {
      if (obj.followUpId === followUpId && obj.idx === idx && obj.id !== excludeId) {
        throw new Error(`Unique constraint failed on (followUpId, idx): idx=${idx}`);
      }
    }
  }

  const tx = {
    followUp: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id !== FOLLOW_UP_ID) return null;
        return {
          id: FOLLOW_UP_ID,
          objectives: [...objectives.values()].sort((a, b) => a.idx - b.idx),
        };
      },
    },
    followUpObjective: {
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<Pick<StoredObjective, "idx" | "text" | "activities">>;
      }) => {
        const obj = objectives.get(where.id);
        if (!obj) throw new Error(`Objective ${where.id} not found`);
        if (data.idx != null) assertUniqueIdx(obj.followUpId, data.idx, obj.id);
        Object.assign(obj, data);
        return obj;
      },
      create: async ({
        data,
      }: {
        data: {
          followUpId: string;
          idx: number;
          text: string;
          activities: string | null;
        };
      }) => {
        assertUniqueIdx(data.followUpId, data.idx);
        const created: StoredObjective = {
          id: `obj-${nextId++}`,
          followUpId: data.followUpId,
          idx: data.idx,
          text: data.text,
          activities: data.activities,
          _count: { marks: 0 },
        };
        objectives.set(created.id, created);
        return created;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        objectives.delete(where.id);
      },
    },
  };

  return {
    objectives,
    prisma: {
      $transaction: async <T>(fn: (innerTx: typeof tx) => Promise<T>) => fn(tx),
    } as unknown as PrismaService,
  };
}

describe("FollowUpsService.replaceObjectivesInternal", () => {
  function makeService(store: ReturnType<typeof createObjectiveStore>) {
    return new FollowUpsService(store.prisma, {} as FollowUpAccessService);
  }

  async function replace(
    service: FollowUpsService,
    objectives: { id?: string; text: string; activities?: string | null }[],
  ) {
    return service.replaceObjectivesWithMeta({} as never, FOLLOW_UP_ID, objectives, {
      skipAccessCheck: true,
    });
  }

  it("borra, reordena y edita objetivos sin colisión de idx", async () => {
    const store = createObjectiveStore([
      { id: "a", idx: 1, text: "A", activities: null, _count: { marks: 0 } },
      { id: "b", idx: 2, text: "B", activities: null, _count: { marks: 0 } },
      { id: "c", idx: 3, text: "C", activities: null, _count: { marks: 0 } },
    ]);
    const service = makeService(store);

    await replace(service, [
      { id: "b", text: "B" },
      { id: "c", text: "C" },
    ]);

    expect([...store.objectives.values()].filter((o) => o.idx < ARCHIVED_OBJECTIVE_IDX)).toEqual([
      expect.objectContaining({ id: "b", idx: 1, text: "B" }),
      expect.objectContaining({ id: "c", idx: 2, text: "C" }),
    ]);
    expect(store.objectives.has("a")).toBe(false);

    await replace(service, [
      { id: "c", text: "C" },
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ]);

    const reordered = [...store.objectives.values()]
      .filter((o) => o.idx < ARCHIVED_OBJECTIVE_IDX)
      .sort((a, b) => a.idx - b.idx);
    expect(reordered).toEqual([
      expect.objectContaining({ idx: 1, text: "C" }),
      expect.objectContaining({ idx: 2, text: "A" }),
      expect.objectContaining({ idx: 3, text: "B" }),
    ]);

    await replace(service, [
      { id: "c", text: "C" },
      { id: "a", text: "A" },
      { id: "b", text: "B actualizado" },
    ]);

    expect(store.objectives.get("b")).toMatchObject({
      idx: 3,
      text: "B actualizado",
    });
  });

  it("archiva objetivos con marcas al quitarlos del payload", async () => {
    const store = createObjectiveStore([
      { id: "a", idx: 1, text: "A", activities: null, _count: { marks: 2 } },
      { id: "b", idx: 2, text: "B", activities: null, _count: { marks: 0 } },
    ]);
    const service = makeService(store);

    await replace(service, [{ id: "b", text: "B" }]);

    expect(store.objectives.get("a")).toMatchObject({ idx: ARCHIVED_OBJECTIVE_IDX, text: "A" });
    expect(store.objectives.get("b")).toMatchObject({ idx: 1, text: "B" });
  });

  it("lanza NotFoundException si el seguimiento no existe", async () => {
    const prisma = {
      $transaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
        fn({
          followUp: {
            findUnique: async () => null,
          },
        }),
    } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, {} as FollowUpAccessService);

    await expect(replace(service, [{ text: "X" }])).rejects.toBeInstanceOf(NotFoundException);
  });
});
