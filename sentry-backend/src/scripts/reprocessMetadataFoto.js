"use strict";

const path = require("path");
const db = require("../models");
const {
  extractExifLocation,
  hitungValidasiLokasi,
} = require("../utils/exifFoto");

function resolveFotoPath(fotoPath) {
  if (!fotoPath) return null;

  if (path.isAbsolute(fotoPath)) {
    return fotoPath;
  }

  return path.join(process.cwd(), fotoPath);
}

async function reprocessMetadataFoto() {
  try {
    console.log("Mulai re-process metadata foto lama...");

    const metadataList = await db.metadata_foto.findAll({
      order: [["metadata_foto_id", "ASC"]],
    });

    console.log(`Total metadata ditemukan: ${metadataList.length}`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const metadata of metadataList) {
      try {
        const laporan = await db.laporan.findByPk(metadata.laporan_id);

        if (!laporan) {
          skipped++;
          console.log(
            `Skip metadata_id ${metadata.metadata_foto_id}: laporan tidak ditemukan`
          );
          continue;
        }

        const fotoKejadian =
          laporan.foto_kejadian ||
          laporan.dataValues?.foto_kejadian ||
          null;

        if (!fotoKejadian) {
          skipped++;
          console.log(
            `Skip laporan_id ${metadata.laporan_id}: foto_kejadian kosong`
          );
          continue;
        }

        const filePath = resolveFotoPath(fotoKejadian);

        const exifResult = await extractExifLocation(filePath);

        const validasi = hitungValidasiLokasi({
          laporanLatitude: laporan.latitude,
          laporanLongitude: laporan.longitude,
          exifLatitude: exifResult.exif_latitude,
          exifLongitude: exifResult.exif_longitude,
          batasMeter: 500,
        });

        await metadata.update({
          exif_latitude:
            exifResult.source === "exif" ? exifResult.exif_latitude : null,

          exif_longitude:
            exifResult.source === "exif" ? exifResult.exif_longitude : null,

          browser_latitude:
            exifResult.source === "browser" ? exifResult.exif_latitude : null,

          browser_longitude:
            exifResult.source === "browser" ? exifResult.exif_longitude : null,

          gps_source: exifResult.source,
          selisih_jarak: validasi.selisih_jarak,
          is_valid_location: validasi.is_valid_location,
          last_updated_by: "system_reprocess",
          last_update_date: new Date(),
        });

        updated++;
        console.log(
          `Updated laporan_id ${metadata.laporan_id} | source: ${exifResult.source} | valid: ${validasi.is_valid_location}`
        );
      } catch (error) {
        failed++;
        console.error(
          `Gagal proses metadata_id ${metadata.metadata_foto_id}:`,
          error.message
        );
      }
    }

    console.log("Re-process selesai.");
    console.log({
      total: metadataList.length,
      updated,
      skipped,
      failed,
    });

    process.exit(0);
  } catch (error) {
    console.error("Fatal error re-process metadata:", error);
    process.exit(1);
  }
}

reprocessMetadataFoto();