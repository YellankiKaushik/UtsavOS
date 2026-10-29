import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { mkdirSync, writeFileSync } from "node:fs";
import { database, event, actor, A, B } from "../helpers/database";
it("restores a synthetic database snapshot with exact data, grants, RLS and guarded commands intact", async () => {
  const source = await database({ storage: true });
  let restored: PGlite | undefined;
  const started = performance.now();
  try {
    const e = await event(source);
    const made = (
      await source.query<{ r: { id: string; version: number } }>(
        "select public.event_command($1,null,'put_budget',$2,1,$3,'restore-fixture') r",
        [
          e.id,
          JSON.stringify({
            fields: {
              title: "Synthetic restore catering",
              category: "catering",
              pricingBasis: "per_guest",
              unitPriceMinor: "85000",
              quantity: null,
              sourceKind: "user_estimate",
              isLocked: false,
            },
          }),
          crypto.randomUUID(),
        ],
      )
    ).rows[0].r;
    await source.exec("reset role");
    const snapshot = await source.dumpDataDir("gzip");
    await source.close();
    const restoreStart = performance.now();
    restored = await PGlite.create({ loadDataDir: snapshot });
    await actor(restored, A);
    const state = (
      await restored.query<{
        r: {
          event: { version: number };
          budgetItems: { unitPriceMinor: string }[];
        };
      }>("select public.event_snapshot($1) r", [e.id])
    ).rows[0].r;
    expect(state.event.version).toBe(made.version);
    expect(state.budgetItems[0].unitPriceMinor).toBe("85000");
    await actor(restored, B);
    await expect(
      restored.query("select public.event_snapshot($1)", [e.id]),
    ).rejects.toThrow("NOT_FOUND");
    expect(
      (await restored.query("select id from public.events where id=$1", [e.id]))
        .rows,
    ).toEqual([]);
    await expect(
      restored.query(
        "update public.events set title='unauthorized' where id=$1",
        [e.id],
      ),
    ).rejects.toThrow("permission denied");
    await actor(restored, A);
    const changed = (
      await restored.query<{ r: { version: number } }>(
        "select public.event_command($1,null,'put_task',$2,$3,$4,'restored-command') r",
        [
          e.id,
          JSON.stringify({
            fields: {
              title: "Restored operational task",
              status: "todo",
              priority: "normal",
              isLocked: false,
              dependencyIds: [],
              dueAt: null,
            },
          }),
          made.version,
          crypto.randomUUID(),
        ],
      )
    ).rows[0].r;
    expect(changed.version).toBe(made.version + 1);
    const report = {
      status: "PASSED",
      environment:
        "PGlite PostgreSQL physical data-directory snapshot; synthetic Auth/Storage catalogues",
      snapshotBytes: snapshot.size,
      restoreAndVerifyMs: Math.round(performance.now() - restoreStart),
      totalMs: Math.round(performance.now() - started),
      checks: [
        "exact canonical money",
        "event version preserved",
        "guarded RPCs writable by owner",
        "cross tenant RPC and RLS denied",
        "direct writes denied",
      ],
      notVerified: [
        "Supabase managed backups/PITR",
        "remote Storage object restoration",
        "Auth delivery/session invalidation",
        "provider retention/backup expiry",
      ],
      remoteDataTouched: false,
    };
    mkdirSync(".runtime/release-20261029", { recursive: true });
    writeFileSync(
      ".runtime/release-20261029/synthetic-restore.json",
      JSON.stringify(report, null, 2),
    );
  } finally {
    await restored?.close();
    await source.close().catch(() => {});
  }
}, 60000);
