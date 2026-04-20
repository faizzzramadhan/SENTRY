'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class data_kecamatan extends Model {
    static associate(models) {
      // nanti saat data_kelurahan sudah punya FK id_kecamatan,
      // bisa diaktifkan:
      data_kecamatan.hasMany(models.data_kelurahan, {
        foreignKey: "id_kecamatan",
        sourceKey: "kecamatan_id",
        as: "kelurahan_list",
      });
    }
  }

  data_kecamatan.init(
    {
      kecamatan_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "kecamatan_id",
      },
      nama_kecamatan: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "nama_kecamatan",
      },
      geojson: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        field: "geojson",
      },
      latitude_center: {
        type: DataTypes.DECIMAL(19, 16),
        allowNull: true,
        field: "latitude_center",
      },
      longitude_center: {
        type: DataTypes.DECIMAL(19, 16),
        allowNull: true,
        field: "longitude_center",
      },
      created_by: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "created_by",
      },
      creation_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "creation_date",
      },
      last_updated_by: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "last_updated_by",
      },
      last_update_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "last_update_date",
      },
    },
    {
      sequelize,
      modelName: "data_kecamatan",
      tableName: "data_kecamatan",
      timestamps: false,
    }
  );

  return data_kecamatan;
};