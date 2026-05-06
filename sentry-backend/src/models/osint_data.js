"use strict";

module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "osint_data",
    {
      osint_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      osint_external_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },

      osint_source: {
        type: DataTypes.ENUM("X", "BMKG", "X_BMKG"),
        allowNull: false,
      },

      osint_datax_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      osint_bmkg_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      osint_x_post_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      osint_event_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      osint_area_text: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      osint_account_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      osint_account_username: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      osint_content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      osint_latitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true,
      },

      osint_longitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true,
      },

      osint_post_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      osint_event_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      osint_link_url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },

      osint_media_url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },

      osint_hashtags: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      osint_like_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      osint_share_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      osint_reply_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      osint_view_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      osint_favourite_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      osint_magnitude: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true,
      },

      osint_depth: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      osint_tsunami_potential: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      osint_bmkg_source_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      osint_bmkg_shakemap_url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },

      osint_adm4_code: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },

      osint_weather_desc: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      osint_temperature_c: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },

      osint_humidity_percent: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      osint_wind_speed_kmh: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },

      osint_wind_direction: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      osint_cloud_cover_percent: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      osint_visibility_text: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      osint_warning_event: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      osint_warning_headline: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      osint_warning_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      osint_warning_effective: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      osint_warning_expires: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      osint_warning_web_url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },

      osint_match_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      osint_match_method: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      osint_match_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      osint_match_status: {
        type: DataTypes.ENUM("NONE", "MATCHED", "REVIEW", "REJECTED"),
        allowNull: false,
        defaultValue: "NONE",
      },

      osint_analysis_status: {
        type: DataTypes.ENUM("RAW", "PROCESSED", "MATCHED", "REVIEW", "REJECTED"),
        allowNull: false,
        defaultValue: "RAW",
      },

      osint_verification_status: {
        type: DataTypes.ENUM(
          "BELUM_DIVERIFIKASI",
          "TERVERIFIKASI_OTOMATIS",
          "TERVERIFIKASI_MANUAL",
          "DITOLAK"
        ),
        allowNull: false,
        defaultValue: "BELUM_DIVERIFIKASI",
      },

      osint_priority_level: {
        type: DataTypes.ENUM("RENDAH", "SEDANG", "TINGGI", "KRITIS"),
        allowNull: false,
        defaultValue: "SEDANG",
      },

      osint_raw_json: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },

      created_by: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "system",
      },

      creation_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      last_updated_by: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "system",
      },

      last_update_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "osint_data",
      timestamps: false,
    }
  );
};