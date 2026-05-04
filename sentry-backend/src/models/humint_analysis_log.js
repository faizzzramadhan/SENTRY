"use strict";

module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "humint_analysis_log",
    {
      id_log: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      id_laporan: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      parameter_cek: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      skor_hasil: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      analyzed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "humint_analysis_log",
      timestamps: false,
    }
  );
};