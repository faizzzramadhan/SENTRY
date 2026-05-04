'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class osint_kpi extends Model {
    static associate(models) {
      // tidak ada relasi langsung
    }
  }

  osint_kpi.init(
    {
      osint_kpi_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "osint_kpi_id",
      },
      set_jumlah_postingan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "set_jumlah_postingan",
      },
      set_jumlah_like: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "set_jumlah_like",
      },
      set_jumlah_comment: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "set_jumlah_comment",
      },
      set_jumlah_share: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "set_jumlah_share",
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
      modelName: "osint_kpi",
      tableName: "osint_kpi",
      timestamps: false,
    }
  );

  return osint_kpi;
};