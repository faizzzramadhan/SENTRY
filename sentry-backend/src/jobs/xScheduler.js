const cron = require("node-cron");
const { runXCrawler } = require("../services/x/xCrawler");

let isRunning = false;

const X_SCHEDULER_ENABLED = process.env.X_SCHEDULER_ENABLED !== "false";
const X_SCHEDULE_CRON = process.env.X_SCHEDULE_CRON || "0 * * * *";

function startXScheduler() {
  if (!X_SCHEDULER_ENABLED) {
    console.log("[x-crawler] scheduler disabled");
    return;
  }

  cron.schedule(
    X_SCHEDULE_CRON,
    async () => {
      if (isRunning) {
        console.log("[x-crawler] skip: previous run still in progress");
        return;
      }

      isRunning = true;

      try {
        console.log("[x-crawler] started");
        const result = await runXCrawler({
          manual: false,
          includeRecords: false,
        });
        console.log("[x-crawler] result:", result);
      } catch (error) {
        console.error("[x-crawler] error:", error.message);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: "Asia/Jakarta",
    }
  );

  console.log(`[x-crawler] scheduler aktif dengan cron: ${X_SCHEDULE_CRON}`);
}

module.exports = {
  startXScheduler,
};