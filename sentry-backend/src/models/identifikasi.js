'use strict';

module.exports = (sequelize, DataTypes) => {
  return sequelize.define("identifikasi", {
    identifikasi_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    id_laporan: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    jumlah_korban_identifikasi: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    kerusakan_identifikasi: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    terdampak_identifikasi: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    penyebab_identifikasi: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    created_by: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "MASYARAKAT",
    },

    creation_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    last_updated_by: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "MASYARAKAT",
    },

    last_update_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: "identifikasi",
    timestamps: false,
  });
};