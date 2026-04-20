'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class data_kelurahan extends Model {
    static associate(models) {
      data_kelurahan.belongsTo(models.data_kecamatan, {
        foreignKey: "id_kecamatan",
        targetKey: "kecamatan_id",
        as: "kecamatan",
      });
    }
  }

  data_kelurahan.init(
    {
      kelurahan_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "kelurahan_id",
      },
      id_kecamatan: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "id_kecamatan",
      },
      nama_kelurahan: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "nama_kelurahan",
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
      modelName: "data_kelurahan",
      tableName: "data_kelurahan",
      timestamps: false,
    }
  );

  return data_kelurahan;
};