"use strict";

module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "metadata_foto",
    {
      metadata_foto_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      laporan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      exif_latitude: {
        type: DataTypes.DECIMAL(19, 16),
        allowNull: true,
      },

      exif_longitude: {
        type: DataTypes.DECIMAL(19, 16),
        allowNull: true,
      },

      browser_latitude: {
        type: DataTypes.DECIMAL(19, 16),
        allowNull: true,
      },

      browser_longitude: {
        type: DataTypes.DECIMAL(19, 16),
        allowNull: true,
      },

      selisih_jarak: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      is_valid_location: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },

      gps_source: {
        type: DataTypes.ENUM("exif", "browser", "none"),
        defaultValue: "none",
      },

      created_by: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      creation_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },

      last_updated_by: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      last_update_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "metadata_foto",
      timestamps: false,
    }
  );
};