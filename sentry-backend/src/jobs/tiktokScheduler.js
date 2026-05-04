const cron = require("node-cron");
const { runTikTokCrawler } = require("../services/tiktok/tiktokCrawler");

let isRunning = false;

function startTikTokScheduler() {
  cron.schedule(
    "*/15 * * * *",
    async () => {
      if (isRunning) {
        console.log("[tiktok-crawler] skip: previous run still in progress");
        return;
      }

      isRunning = true;

      try {
        console.log("[tiktok-crawler] started");
        const result = await runTikTokCrawler({ manual: false });
        console.log("[tiktok-crawler] result:", result);
      } catch (error) {
        console.error("[tiktok-crawler] error:", error.message);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: "Asia/Jakarta",
    }
  );

  console.log("[tiktok-crawler] scheduler aktif setiap 15 menit");
}

module.exports = {
  startTikTokScheduler,
};