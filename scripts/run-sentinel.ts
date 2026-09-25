import { createLiveSentinelRunner } from "../src/services/live-sentinel.ts";

const tenMinuteBucket = Math.floor(Date.now() / 600_000);
const result = await createLiveSentinelRunner().run({
  idempotencyKey: `scheduled:CONT-SPCXx:${tenMinuteBucket}`,
  trigger: "SCHEDULED",
});

console.log(
  JSON.stringify(
    {
      action: result.record.document.decision.action,
      evidenceHash: result.record.document.evidenceHash,
      nextRunAt: result.record.document.nextRunAt,
      recordHash: result.record.integrity.recordHash,
      reused: result.reused,
      runId: result.record.document.runId,
      transaction: result.record.document.execution.transaction,
      verdict: result.record.document.decision.verdict,
    },
    null,
    2,
  ),
);
