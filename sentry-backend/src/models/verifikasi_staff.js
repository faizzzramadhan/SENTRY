'use strict';

module.exports = (sequelize, DataTypes) => {
  return sequelize.define("verifikasi_staff", {
    verifikasi_staff_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    laporan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    detail_korban_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    kerusakan_verifikasi: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    terdampak_verifikasi: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    penyebab_verifikasi: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    prakiraan_kerugian: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    rekomendasi_tindak_lanjut: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tindak_lanjut: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    petugas_trc: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    usr_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "staff",
    },
    creation_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_updated_by: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "staff",
    },
    last_update_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: "verifikasi_staff",
    timestamps: false,
  });
};
