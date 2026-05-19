const cron = require("node-cron");
const { syncOsintData } = require("../services/osint/osintDataIntegrator");

let isRunning = false;

const OSINT_DATA_SYNC_SCHEDULER_ENABLED =
  process.env.OSINT_DATA_SYNC_SCHEDULER_ENABLED !== "false";

const OSINT_DATA_SYNC_SCHEDULE_CRON =
  process.env.OSINT_DATA_SYNC_SCHEDULE_CRON || "*/30 * * * *";

const OSINT_DATA_SYNC_ENABLE_CORRELATION =
  String(process.env.OSINT_DATA_SYNC_ENABLE_CORRELATION || "true").toLowerCase() !==
  "false";

const OSINT_DATA_SYNC_INCLUDE_RECORDS =
  String(process.env.OSINT_DATA_SYNC_INCLUDE_RECORDS || "false").toLowerCase() ===
  "true";

async function runScheduledOsintDataSync() {
  if (isRunning) {
    console.log("[osint-data-sync] skip: previous sync still in progress");
    return;
  }

  isRunning = true;

  try {
    console.log("[osint-data-sync] started");

    const result = await syncOsintData({
      includeRecords: OSINT_DATA_SYNC_INCLUDE_RECORDS,
      enableCorrelation: OSINT_DATA_SYNC_ENABLE_CORRELATION,
    });

    console.log("[osint-data-sync] result:", {
      ok: result.ok,
      keyword_count: result.keyword_count,
      x: result.x,
      bmkg: result.bmkg,
      correlation: result.correlation,
      finished_at: result.finished_at,
    });
  } catch (error) {
    console.error("[osint-data-sync] error:", error.message);
  } finally {
    isRunning = false;
  }
}

function startOsintDataScheduler() {
  if (!OSINT_DATA_SYNC_SCHEDULER_ENABLED) {
    console.log("[osint-data-sync] scheduler disabled");
    return;
  }

  const cronExpression = cron.validate(OSINT_DATA_SYNC_SCHEDULE_CRON)
    ? OSINT_DATA_SYNC_SCHEDULE_CRON
    : "*/30 * * * *";

  cron.schedule(
    cronExpression,
    async () => {
      await runScheduledOsintDataSync();
    },
    {
      timezone: "Asia/Jakarta",
    }
  );

  console.log(`[osint-data-sync] scheduler aktif dengan cron: ${cronExpression}`);
}

module.exports = {
  startOsintDataScheduler,
  runScheduledOsintDataSync,
};