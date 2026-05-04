const { Op } = require("sequelize");
const models = require("../../models");
const { runPythonWorker } = require("./pythonRunner");

const DataKeyword = models.data_keyword;
const OsintDataX = models.osint_data_x;

const X_INSERT_MODE = (process.env.X_INSERT_MODE || "dedup").toLowerCase();
const X_PREVIEW_LIMIT = Number(process.env.X_PREVIEW_LIMIT || 100);
const X_WORKER_LIMIT = Number(process.env.X_WORKER_LIMIT || 20);
const X_MAX_POST_AGE_DAYS = Number(process.env.OSINT_X_MAX_POST_AGE_DAYS || 30);
const OSINT_X_RETENTION_DAYS = Number(process.env.OSINT_X_RETENTION_DAYS || 30);
const X_CRAWLER_MAX_RUNTIME_MS = Number(
  process.env.X_CRAWLER_MAX_RUNTIME_MS || 900000
);

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function uniqStrings(values) {
  const seen = new Set();
  const result = [];

  for (const raw of values) {
    const value = String(raw || "").trim();
    if (!value) continue;

    const key = normalizeText(value);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    result.push(value);
  }

  return result;
}

function extractStatusIdFromLink(linkUrl) {
  const text = String(linkUrl || "");
  const match = text.match(/\/status\/(\d+)/i);
  return match ? match[1] : null;
}

function buildKeywordSeeds(keywordRows) {
  return uniqStrings(keywordRows.map((row) => row.keyword));
}

function findMatchedKeywords(mapped, keywordTerms) {
  const sourceText = normalizeText(
    [
      mapped.osint_account_name,
      mapped.osint_account_username,
      mapped.osint_location_text,
      mapped.osint_hashtags,
      mapped.raw_text,
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (!sourceText) return [];

  return keywordTerms.filter((keyword) =>
    sourceText.includes(normalizeText(keyword))
  );
}

function parsePostDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function isWithinLastDays(dateValue, days) {
  const date = parsePostDate(dateValue);
  if (!date) return false;

  const now = Date.now();
  const diffMs = now - date.getTime();
  const maxMs = Number(days) * 24 * 60 * 60 * 1000;

  return diffMs >= 0 && diffMs <= maxMs;
}

function mapWorkerRecordToOsintRow(record) {
  const fallbackPostId = extractStatusIdFromLink(record.link_url);

  return {
    osint_account_name: record.account_name || null,
    osint_account_username: record.account_username || null,
    osint_location_text: null,
    osint_latitude: null,
    osint_longitude: null,
    osint_post_time: record.post_time ? parsePostDate(record.post_time) : null,
    osint_x_post_id: record.x_post_id || fallbackPostId || null,
    osint_link_url: record.link_url || null,
    osint_like_count: Number(record.like_count || 0),
    osint_share_count: Number(record.share_count || 0),
    osint_favourite_count:
      record.favourite_count === null || record.favourite_count === undefined
        ? null
        : Number(record.favourite_count || 0),
    osint_view_count: Number(record.view_count || 0),
    osint_comment_count: Number(record.comment_count || 0),
    osint_hashtags: Array.isArray(record.hashtags)
      ? record.hashtags.join(", ")
      : null,
    osint_media_url: record.media_url || null,
    raw_text: record.content || "",
    raw_hashtags_array: Array.isArray(record.hashtags) ? record.hashtags : [],
    osint_raw_json: {
      worker_record: record.raw_json || record,
    },
  };
}

async function cleanupExpiredOsintData() {
  const cutoff = new Date(
    Date.now() - OSINT_X_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  const deletedCount = await OsintDataX.destroy({
    where: {
      [Op.or]: [
        {
          osint_post_time: {
            [Op.lt]: cutoff,
          },
        },
        {
          [Op.and]: [
            {
              osint_post_time: {
                [Op.is]: null,
              },
            },
            {
              osint_creation_date: {
                [Op.lt]: cutoff,
              },
            },
          ],
        },
      ],
    },
  });

  return deletedCount;
}

async function saveOsintData(mappedRow, seed, meta = {}, insertMode = "dedup") {
  const payload = {
    osint_account_name: mappedRow.osint_account_name,
    osint_account_username: mappedRow.osint_account_username,
    osint_location_text: mappedRow.osint_location_text,
    osint_latitude: mappedRow.osint_latitude,
    osint_longitude: mappedRow.osint_longitude,
    osint_post_time: mappedRow.osint_post_time,
    osint_x_post_id: mappedRow.osint_x_post_id,
    osint_link_url: mappedRow.osint_link_url,
    osint_like_count: mappedRow.osint_like_count,
    osint_share_count: mappedRow.osint_share_count,
    osint_favourite_count: mappedRow.osint_favourite_count,
    osint_view_count: mappedRow.osint_view_count,
    osint_comment_count: mappedRow.osint_comment_count,
    osint_hashtags: mappedRow.osint_hashtags,
    osint_media_url: mappedRow.osint_media_url,
    osint_raw_json: {
      ...mappedRow.osint_raw_json,
      seed,
      filter_evaluation: meta,
      saved_at: new Date().toISOString(),
    },
    osint_last_update_date: new Date(),
  };

  if (insertMode === "all_records") {
    await OsintDataX.create({
      ...payload,
      osint_creation_date: new Date(),
    });

    return "created";
  }

  let existing = null;

  if (mappedRow.osint_x_post_id) {
    existing = await OsintDataX.findOne({
      where: {
        osint_x_post_id: mappedRow.osint_x_post_id,
      },
    });
  }

  if (!existing && mappedRow.osint_link_url) {
    existing = await OsintDataX.findOne({
      where: {
        osint_link_url: mappedRow.osint_link_url,
      },
    });
  }

  if (existing) {
    await existing.update(payload);
    return "updated";
  }

  await OsintDataX.create({
    ...payload,
    osint_creation_date: new Date(),
  });

  return "created";
}

function buildPreviewRecord({
  seed,
  mapped,
  matchedKeywords,
  passedKeywordFilter,
  passedRecentFilter,
  savedToDb,
  insertMode,
}) {
  return {
    seed,
    id: mapped.osint_x_post_id,
    text: mapped.raw_text,
    created_at: mapped.osint_post_time,
    username: mapped.osint_account_username,
    account_name: mapped.osint_account_name,
    location_text: mapped.osint_location_text,
    link_url: mapped.osint_link_url,
    media_url: mapped.osint_media_url,
    hashtags: mapped.raw_hashtags_array || [],
    matched_keywords: matchedKeywords,
    passed_keyword_filter: passedKeywordFilter,
    passed_recent_filter: passedRecentFilter,
    saved_to_db: savedToDb,
    insert_mode: insertMode,
    public_metrics: {
      like_count: mapped.osint_like_count,
      share_count: mapped.osint_share_count,
      favourite_count: mapped.osint_favourite_count,
      view_count: mapped.osint_view_count,
      comment_count: mapped.osint_comment_count,
    },
  };
}

async function runXCrawler({
  manual = false,
  includeRecords = false,
  insertMode = X_INSERT_MODE,
} = {}) {
  const startedAtMs = Date.now();

  const normalizedInsertMode =
    String(insertMode || "dedup").toLowerCase() === "all_records"
      ? "all_records"
      : "dedup";

  const keywordRows = await DataKeyword.findAll({
    attributes: ["keyword"],
    raw: true,
    order: [["keyword_id", "DESC"]],
  });

  const deletedOldDataCount = await cleanupExpiredOsintData();

  const keywordTerms = buildKeywordSeeds(keywordRows);

  if (!keywordTerms.length) {
    return {
      ok: false,
      mode: manual ? "manual" : "scheduler",
      message: "Data keyword kosong. Isi table data_keyword terlebih dahulu.",
      insert_mode: normalizedInsertMode,
      cleanup_deleted_count: deletedOldDataCount,
      keyword_count: 0,
      keyword_term_count: 0,
      inspected_count: 0,
      saved_count: 0,
      updated_count: 0,
      skipped_old_count: 0,
      skipped_keyword_filter_count: 0,
      failed_count: 0,
      empty_keyword_count: 0,
      timeout_count: 0,
      finished_at: new Date().toISOString(),
    };
  }

  let keywordCount = 0;
  let inspectedCount = 0;
  let savedCount = 0;
  let updatedCount = 0;
  let skippedOldCount = 0;
  let skippedKeywordFilterCount = 0;
  let failedCount = 0;
  let emptyKeywordCount = 0;
  let timeoutCount = 0;
  let stoppedByRuntimeLimit = false;

  const previewRecords = [];

  for (const seed of keywordTerms) {
    if (Date.now() - startedAtMs > X_CRAWLER_MAX_RUNTIME_MS) {
      stoppedByRuntimeLimit = true;
      console.warn("[x-crawler] stopped by max runtime limit");
      break;
    }

    keywordCount += 1;

    try {
      console.log("[x-crawler] keyword:", seed);

      const workerResult = await runPythonWorker({
        keyword: seed,
        limit: X_WORKER_LIMIT,
        timeoutMs: Number(process.env.X_WORKER_TIMEOUT_MS || 120000),
      });

      if (!workerResult?.ok) {
        failedCount += 1;

        if (workerResult?.timeout) {
          timeoutCount += 1;
        }

        console.error(
          "[x-crawler] worker error:",
          workerResult?.message || "unknown"
        );

        continue;
      }

      const records = Array.isArray(workerResult.records)
        ? workerResult.records
        : [];

      if (!records.length) {
        emptyKeywordCount += 1;
        console.log("[x-crawler] worker empty:", seed);
        continue;
      }

      for (const record of records) {
        inspectedCount += 1;

        const mapped = mapWorkerRecordToOsintRow(record);

        if (!mapped.osint_x_post_id && !mapped.osint_link_url) {
          failedCount += 1;
          continue;
        }

        const matchedKeywords = findMatchedKeywords(mapped, keywordTerms);
        const passedKeywordFilter = matchedKeywords.length > 0;

        const passedRecentFilter = isWithinLastDays(
          mapped.osint_post_time,
          X_MAX_POST_AGE_DAYS
        );

        if (!passedRecentFilter) {
          skippedOldCount += 1;
        }

        if (!passedKeywordFilter) {
          skippedKeywordFilterCount += 1;
        }

        const shouldSave = passedRecentFilter && passedKeywordFilter;

        if (includeRecords && previewRecords.length < X_PREVIEW_LIMIT) {
          previewRecords.push(
            buildPreviewRecord({
              seed,
              mapped,
              matchedKeywords,
              passedKeywordFilter,
              passedRecentFilter,
              savedToDb: shouldSave,
              insertMode: normalizedInsertMode,
            })
          );
        }

        if (!shouldSave) {
          continue;
        }

        const saveStatus = await saveOsintData(
          mapped,
          seed,
          {
            passed_recent_filter: passedRecentFilter,
            passed_keyword_filter: passedKeywordFilter,
            matched_keywords: matchedKeywords,
            filter_source: "data_keyword",
          },
          normalizedInsertMode
        );

        if (saveStatus === "created") {
          savedCount += 1;
        }

        if (saveStatus === "updated") {
          updatedCount += 1;
        }
      }
    } catch (error) {
      failedCount += 1;
      console.error("[x-crawler] keyword error:", seed, error.message);
    }
  }

  const result = {
    ok: savedCount > 0 || updatedCount > 0 || inspectedCount > 0,
    mode: manual ? "manual" : "scheduler",
    filter_source: "data_keyword_only",
    insert_mode: normalizedInsertMode,
    stopped_by_runtime_limit: stoppedByRuntimeLimit,
    max_runtime_ms: X_CRAWLER_MAX_RUNTIME_MS,
    max_post_age_days: X_MAX_POST_AGE_DAYS,
    worker_limit: X_WORKER_LIMIT,
    cleanup_deleted_count: deletedOldDataCount,
    keyword_count: keywordCount,
    keyword_term_count: keywordTerms.length,
    inspected_count: inspectedCount,
    saved_count: savedCount,
    updated_count: updatedCount,
    skipped_old_count: skippedOldCount,
    skipped_keyword_filter_count: skippedKeywordFilterCount,
    failed_count: failedCount,
    empty_keyword_count: emptyKeywordCount,
    timeout_count: timeoutCount,
    finished_at: new Date().toISOString(),
  };

  if (includeRecords) {
    result.records = previewRecords;
  }

  return result;
}

module.exports = {
  runXCrawler,
  cleanupExpiredOsintData,
};