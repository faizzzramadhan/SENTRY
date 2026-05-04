const { chromium } = require("playwright");
const cheerio = require("cheerio");

const models = require("../../models");
const {
  extractCoordinatesFromText,
  isMetricsAllowed,
  isMalangAllowed,
} = require("./locationFilter");

const DataKeyword = models.data_keyword;
const DataKecamatan = models.data_kecamatan;
const DataKelurahan = models.data_kelurahan;
const OsintDataTiktok = models.osint_data_tiktok;

const MAX_LINKS_PER_KEYWORD = Number(process.env.TIKTOK_MAX_LINKS_PER_KEYWORD || 12);
const SEARCH_SCROLL_COUNT = Number(process.env.TIKTOK_SEARCH_SCROLL_COUNT || 6);
const HEADLESS = process.env.TIKTOK_HEADLESS !== "false";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickFirstMatch(text, patterns, fallback = null) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] !== undefined) {
      return match[1];
    }
  }
  return fallback;
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? parseInt(n, 10) : fallback;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseJsonLd($) {
  const scripts = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).html())
    .get()
    .filter(Boolean);

  for (const raw of scripts) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const videoObject = parsed.find((item) => item["@type"] === "VideoObject");
        if (videoObject) return videoObject;
      }
      if (parsed?.["@type"] === "VideoObject") return parsed;
    } catch {
      // skip
    }
  }

  return null;
}

function extractHashtags(caption) {
  const matches = String(caption || "").match(/#[\p{L}\p{N}_]+/gu) || [];
  return [...new Set(matches.map((tag) => tag.replace(/^#/, "").trim()))];
}

function extractTikTokFields(html, url) {
  const $ = cheerio.load(html);
  const jsonLd = parseJsonLd($);

  const canonicalUrl =
    $('link[rel="canonical"]').attr("href") ||
    $('meta[property="og:url"]').attr("content") ||
    url;

  const usernameFromUrl =
    canonicalUrl.match(/tiktok\.com\/@([^/]+)\/video\//)?.[1] ||
    url.match(/tiktok\.com\/@([^/]+)\/video\//)?.[1] ||
    null;

  const videoId =
    canonicalUrl.match(/\/video\/(\d+)/)?.[1] ||
    url.match(/\/video\/(\d+)/)?.[1] ||
    null;

  const caption =
    jsonLd?.description ||
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    pickFirstMatch(html, [/"desc":"([^"]+)"/], "");

  const mediaUrl =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[property="og:video"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    null;

  const likeCount = toInt(
    pickFirstMatch(html, [/"diggCount":(\d+)/, /"like_count":(\d+)/], "0")
  );

  const shareCount = toInt(
    pickFirstMatch(html, [/"shareCount":(\d+)/, /"share_count":(\d+)/], "0")
  );

  const favouriteCountRaw = pickFirstMatch(
    html,
    [/"collectCount":(\d+)/, /"favorites_count":(\d+)/, /"favouriteCount":(\d+)/],
    null
  );
  const favouriteCount =
    favouriteCountRaw === null ? null : toInt(favouriteCountRaw, 0);

  const viewCount = toInt(
    pickFirstMatch(html, [/"playCount":(\d+)/, /"view_count":(\d+)/], "0")
  );

  const commentCount = toInt(
    pickFirstMatch(html, [/"commentCount":(\d+)/, /"comment_count":(\d+)/], "0")
  );

  const accountName =
    jsonLd?.author?.name ||
    $('meta[property="og:title"]').attr("content") ||
    usernameFromUrl ||
    null;

  const createTimeRaw = pickFirstMatch(html, [/"createTime":(\d+)/], null);

  const postTime =
    parseDate(jsonLd?.uploadDate) ||
    parseDate(createTimeRaw ? Number(createTimeRaw) * 1000 : null);

  const hashtags = extractHashtags(caption);
  const coords = extractCoordinatesFromText(caption);

  return {
    osint_account_name: accountName,
    osint_account_username: usernameFromUrl,
    osint_latitude: coords.latitude,
    osint_longitude: coords.longitude,
    osint_post_time: postTime,
    osint_tiktok_video_id: videoId,
    osint_link_url: canonicalUrl,
    osint_like_count: likeCount,
    osint_share_count: shareCount,
    osint_favourite_count: favouriteCount,
    osint_view_count: viewCount,
    osint_comment_count: commentCount,
    osint_hashtags: hashtags.length ? hashtags.join(", ") : null,
    osint_media_url: mediaUrl,
    caption,
    hashtags,
    raw_json: {
      caption,
      hashtags,
      json_ld: jsonLd,
    },
  };
}

async function collectSearchLinks(page, keyword) {
  const searchUrl = `https://www.tiktok.com/search/video?q=${encodeURIComponent(keyword)}`;

  console.log("[tiktok] search keyword:", keyword);
  console.log("[tiktok] search url:", searchUrl);

  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(5000);

  const blockCheck = await detectTikTokBlock(page);

  await page.screenshot({
    path: `tiktok-search-${Date.now()}.png`,
    fullPage: true,
  });

  if (blockCheck.captchaDetected) {
    const err = new Error("TikTok captcha/challenge terdeteksi pada halaman search.");
    err.code = "TIKTOK_CAPTCHA_BLOCK";
    throw err;
  }

  if (blockCheck.loginDetected) {
    const err = new Error("TikTok login gate terdeteksi pada halaman search.");
    err.code = "TIKTOK_LOGIN_BLOCK";
    throw err;
  }

  for (let i = 0; i < SEARCH_SCROLL_COUNT; i += 1) {
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(2500);
  }

  const title = await page.title();
  const currentUrl = page.url();
  console.log("[tiktok] current page title:", title);
  console.log("[tiktok] current page url:", currentUrl);

  const html = await page.content();
  console.log("[tiktok] html length:", html.length);

  const linksFromDom = await page.$$eval("a", (anchors) => {
    return [...new Set(
      anchors
        .map((a) => a.href)
        .filter(Boolean)
        .filter((href) => href.includes("/video/"))
    )];
  });

  const fallbackLinks = [...html.matchAll(/https:\/\/www\.tiktok\.com\/@[^"'\\s]+\/video\/\d+/g)]
    .map((m) => m[0]);

  const mergedLinks = [...new Set([...linksFromDom, ...fallbackLinks])];

  console.log("[tiktok] collected raw links:", linksFromDom.length);
  console.log("[tiktok] fallback links:", fallbackLinks.length);
  console.log("[tiktok] merged links:", mergedLinks.length);
  console.log("[tiktok] sample links:", mergedLinks.slice(0, 5));

  return mergedLinks.slice(0, MAX_LINKS_PER_KEYWORD);
}

async function scrapeVideoPage(context, url) {
  const page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(2500);

    const html = await page.content();
    return extractTikTokFields(html, url);
  } finally {
    await page.close();
  }
}

async function upsertTiktokPost(post, keyword) {
  const existing = post.osint_tiktok_video_id
    ? await OsintDataTiktok.findOne({
        where: { osint_tiktok_video_id: post.osint_tiktok_video_id },
      })
    : null;

  const payload = {
    osint_account_name: post.osint_account_name,
    osint_account_username: post.osint_account_username,
    osint_location_text: post.osint_location_text,
    osint_latitude: post.osint_latitude,
    osint_longitude: post.osint_longitude,
    osint_post_time: post.osint_post_time,
    osint_tiktok_video_id: post.osint_tiktok_video_id,
    osint_link_url: post.osint_link_url,
    osint_like_count: post.osint_like_count,
    osint_share_count: post.osint_share_count,
    osint_favourite_count: post.osint_favourite_count,
    osint_view_count: post.osint_view_count,
    osint_comment_count: post.osint_comment_count,
    osint_hashtags: post.osint_hashtags,
    osint_media_url: post.osint_media_url,
    osint_raw_json: {
      ...post.raw_json,
      keyword,
      matched_location_text: post.osint_location_text,
      scraped_at: new Date().toISOString(),
    },
    osint_last_update_date: new Date(),
  };

  if (existing) {
    await existing.update(payload);
    return { action: "updated" };
  }

  await OsintDataTiktok.create({
    ...payload,
    osint_creation_date: new Date(),
  });

  return { action: "created" };
}

async function runTikTokCrawler({ manual = false } = {}) {
  const keywordRows = await DataKeyword.findAll({
    attributes: ["keyword"],
    raw: true,
    order: [["keyword_id", "DESC"]],
  });

  const kecamatanRows = await DataKecamatan.findAll({ raw: true });
  const kelurahanRows = await DataKelurahan.findAll({ raw: true });

  const masterData = { kecamatanRows, kelurahanRows };

  const path = require("path");

  const USER_DATA_DIR =
    process.env.TIKTOK_USER_DATA_DIR ||
    path.join(process.cwd(), ".pw-tiktok-session");

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: HEADLESS,
    locale: "id-ID",
    userAgent:
      process.env.TIKTOK_USER_AGENT ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
  });

  await context.route("**/*", async (route) => {
    const resourceType = route.request().resourceType();

    // Saat debugging / search TikTok, jangan blok image
    if (["media"].includes(resourceType)) {
      return route.abort();
    }

    return route.continue();
  });

  const searchPage = await context.newPage();

  let keywordCount = 0;
  let linkCount = 0;
  let inspectedCount = 0;
  let savedCount = 0;
  let skippedThreshold = 0;
  let skippedLocation = 0;
  let failedCount = 0;

  try {
    for (const keywordRow of keywordRows) {
      const keyword = String(keywordRow.keyword || "").trim();
      if (!keyword) continue;

      keywordCount += 1;

      let links = [];
      try {
        links = await collectSearchLinks(searchPage, keyword);
      } catch (error) {
        console.error("[tiktok] collectSearchLinks error:", keyword, error.message);

        if (error.code === "TIKTOK_CAPTCHA_BLOCK" || error.code === "TIKTOK_LOGIN_BLOCK") {
          return {
            ok: false,
            mode: manual ? "manual" : "scheduler",
            blocked: true,
            blocked_reason: error.code,
            keyword_count: keywordCount,
            collected_links: linkCount,
            inspected_count: inspectedCount,
            saved_count: savedCount,
            skipped_threshold_count: skippedThreshold,
            skipped_location_count: skippedLocation,
            failed_count: failedCount + 1,
            finished_at: new Date().toISOString(),
          };
        }

        failedCount += 1;
        continue;
      }

      linkCount += links.length;

      for (const link of links) {
        try {
          await sleep(1200);

          const post = await scrapeVideoPage(context, link);
          inspectedCount += 1;

          if (!post?.osint_tiktok_video_id && !post?.osint_link_url) {
            console.warn("[tiktok] invalid parsed post:", link);
            failedCount += 1;
            continue;
          }

          if (!isMetricsAllowed(post)) {
            skippedThreshold += 1;
            continue;
          }

          const locationCheck = isMalangAllowed(post, masterData);
          if (!locationCheck.allowed) {
            skippedLocation += 1;
            continue;
          }

          post.osint_location_text = locationCheck.locationText;
          post.osint_latitude = locationCheck.latitude;
          post.osint_longitude = locationCheck.longitude;

          await upsertTiktokPost(post, keyword);
          savedCount += 1;
        } catch (error) {
          console.error("[tiktok] scrape/save error:", link, error.message);
          failedCount += 1;
        }
      }
    }

    return {
      ok: true,
      mode: manual ? "manual" : "scheduler",
      keyword_count: keywordCount,
      collected_links: linkCount,
      inspected_count: inspectedCount,
      saved_count: savedCount,
      skipped_threshold_count: skippedThreshold,
      skipped_location_count: skippedLocation,
      failed_count: failedCount,
      finished_at: new Date().toISOString(),
    };
  } finally {
    await searchPage.close();
    await context.close();
  }
}

async function detectTikTokBlock(page) {
  const html = await page.content();
  const text = await page.evaluate(() => document.body.innerText || "");
  const combined = `${html}\n${text}`.toLowerCase();

  const captchaDetected =
    combined.includes("tarik penggeser agar sesuai dengan puzzle") ||
    combined.includes("drag the slider") ||
    combined.includes("captcha");

  // Login button biasa jangan dianggap block.
  // Hanya anggap login gate kalau memang ada pesan wajib login / sign in wall.
  const loginGateDetected =
    combined.includes("log in to continue") ||
    combined.includes("login to continue") ||
    combined.includes("sign in to continue") ||
    combined.includes("masuk untuk melanjutkan") ||
    combined.includes("login required");

  return {
    captchaDetected,
    loginDetected: loginGateDetected,
  };
}

module.exports = {
  runTikTokCrawler,
};