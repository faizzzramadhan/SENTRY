'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class analisis_sistem extends Model {
    static associate(models) {
      analisis_sistem.belongsTo(models.laporan, {
        foreignKey: "id_laporan",
        targetKey: "laporan_id",
        as: "laporan",
      });
    }
  }

  analisis_sistem.init(
    {
      analisis_sistem_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      id_laporan: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      skor_kredibilitas: {
        type: DataTypes.ENUM("RENDAH", "SEDANG", "TINGGI"),
        allowNull: true,
        defaultValue: "RENDAH",
      },
      prioritas: {
        type: DataTypes.ENUM(
          "PRIORITAS RENDAH",
          "PRIORITAS SEDANG",
          "PRIORITAS TINGGI"
        ),
        allowNull: true,
        defaultValue: "PRIORITAS RENDAH",
      },
      status_laporan: {
        type: DataTypes.ENUM(
          "IDENTIFIKASI",
          "TERVERIFIKASI",
          "DITANGANI",
          "SELESAI"
        ),
        allowNull: true,
        defaultValue: "IDENTIFIKASI",
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
    },
    {
      sequelize,
      modelName: "analisis_sistem",
      tableName: "analisis_sistem",
      timestamps: false,
    }
  );

  return analisis_sistem;
};
