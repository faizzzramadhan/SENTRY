'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class laporan extends Model {
    static associate(models) {
      laporan.hasOne(models.identifikasi, { foreignKey: "id_laporan" });
      laporan.hasOne(models.verifikasi_staff, { foreignKey: "laporan_id" });
      laporan.hasOne(models.analisis_sistem, { foreignKey: "id_laporan" });
      laporan.hasMany(models.detail_korban, { foreignKey: "laporan_id" });
      laporan.hasOne(models.metadata_foto, { foreignKey: "laporan_id" });

      if (models.osint_reference) {
        laporan.hasMany(models.osint_reference, { foreignKey: "laporan_id" });
      }
      laporan.belongsTo(models.jenis_bencana, {
        foreignKey: "id_jenis",
        as: "jenis_bencana"
        });

        laporan.belongsTo(models.nama_bencana, {
        foreignKey: "id_bencana",
        as: "nama_bencana"
        });

        laporan.belongsTo(models.data_kecamatan, {
        foreignKey: "id_kecamatan",
        as: "kecamatan"
        });

        laporan.belongsTo(models.data_kelurahan, {
        foreignKey: "id_kelurahan",
        as: "kelurahan"
        });
    }
  }

  laporan.init({
    laporan_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    jenis_laporan: {
    type: DataTypes.ENUM("NON_ASSESSMENT", "ASSESSMENT"),
    allowNull: false,
    defaultValue: "ASSESSMENT",
  },
    nama_pelapor: DataTypes.STRING,
    no_hp: DataTypes.STRING,
    alamat_pelapor: DataTypes.STRING,
    id_jenis: DataTypes.INTEGER,
    id_bencana: DataTypes.INTEGER,
    id_kecamatan: DataTypes.INTEGER,
    id_kelurahan: DataTypes.INTEGER,
    kronologi: DataTypes.TEXT,
    foto_kejadian: DataTypes.STRING,
    foto_kerusakan: DataTypes.STRING,
    jenis_lokasi: {
    type: DataTypes.ENUM("PEMUKIMAN", "JALAN_RAYA", "FASILITAS_UMUM", "AREA_TIDAK_PADAT"),
    allowNull: false,
  },
    latitude: DataTypes.DECIMAL(19,16),
    longitude: DataTypes.DECIMAL(19,16),
    alamat_lengkap_kejadian: DataTypes.STRING,
    waktu_kejadian: DataTypes.DATE,
    waktu_laporan: DataTypes.DATE,
    created_by: DataTypes.STRING,
    creation_date: DataTypes.DATE,
    last_updated_by: DataTypes.STRING,
    last_update_date: DataTypes.DATE,
  }, {
    sequelize,
    modelName: "laporan",
    tableName: "laporan",
    timestamps: false,
  });

  return laporan;
};