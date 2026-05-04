'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class osint_data_bmkg extends Model {
    static associate(models) {}
  }

  osint_data_bmkg.init(
    {
      osint_bmkg_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "osint_bmkg_id",
      },

      source_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "source_type",
      },

      source_endpoint: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "source_endpoint",
      },

      external_event_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        field: "external_event_hash",
      },

      tanggal: {
        type: DataTypes.STRING(30),
        allowNull: true,
        field: "tanggal",
      },

      jam: {
        type: DataTypes.STRING(30),
        allowNull: true,
        field: "jam",
      },

      event_datetime_utc: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "event_datetime_utc",
      },

      coordinates_raw: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "coordinates_raw",
      },

      latitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true,
        field: "latitude",
      },

      longitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true,
        field: "longitude",
      },

      magnitude: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true,
        field: "magnitude",
      },

      kedalaman_km: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "kedalaman_km",
      },

      wilayah_episenter: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "wilayah_episenter",
      },

      potensi_tsunami: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: "potensi_tsunami",
      },

      is_tsunami_potential: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_tsunami_potential",
      },

      dirasakan: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "dirasakan",
      },

      shakemap_url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
        field: "shakemap_url",
      },

      verification_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "TERVERIFIKASI_OTOMATIS",
        field: "verification_status",
      },

      priority_level: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "SEDANG",
        field: "priority_level",
      },

      raw_response: {
        type: DataTypes.JSON,
        allowNull: true,
        field: "raw_response",
      },

      crawled_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "crawled_at",
      },
            adm4_code: {
        type: DataTypes.STRING(30),
        allowNull: true,
        field: "adm4_code",
      },

      wilayah_administratif: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "wilayah_administratif",
      },

      weather_desc: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: "weather_desc",
      },

      temperature_c: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: "temperature_c",
      },

      humidity_percent: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "humidity_percent",
      },

      wind_speed_kmh: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        field: "wind_speed_kmh",
      },

      wind_direction: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "wind_direction",
      },

      cloud_cover_percent: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "cloud_cover_percent",
      },

      visibility_text: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "visibility_text",
      },

      warning_event: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: "warning_event",
      },

      warning_headline: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "warning_headline",
      },

      warning_description: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "warning_description",
      },

      warning_effective: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "warning_effective",
      },

      warning_expires: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "warning_expires",
      },

      warning_web_url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
        field: "warning_web_url",
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      sequelize,
      modelName: "osint_data_bmkg",
      tableName: "osint_data_bmkg",
      timestamps: false,
    }
  );

  return osint_data_bmkg;
};