const cron = require("node-cron");
const { runBmkgCrawler } = require("../services/bmkg/bmkgCrawler");

let isRunning = false;

const BMKG_SCHEDULER_ENABLED = process.env.BMKG_SCHEDULER_ENABLED !== "false";
const BMKG_SCHEDULE_CRON = process.env.BMKG_SCHEDULE_CRON || "0 * * * *";

function startBmkgScheduler() {
  if (!BMKG_SCHEDULER_ENABLED) {
    console.log("[bmkg-crawler] scheduler disabled");
    return;
  }

  cron.schedule(
    BMKG_SCHEDULE_CRON,
    async () => {
      if (isRunning) {
        console.log("[bmkg-crawler] skip: previous run still in progress");
        return;
      }

      isRunning = true;

      try {
        console.log("[bmkg-crawler] started");
        const result = await runBmkgCrawler({ manual: false });
        console.log("[bmkg-crawler] result:", result);
      } catch (error) {
        console.error("[bmkg-crawler] error:", error.message);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: "Asia/Jakarta",
    }
  );

  console.log(`[bmkg-crawler] scheduler aktif dengan cron: ${BMKG_SCHEDULE_CRON}`);
}

module.exports = {
  startBmkgScheduler,
};