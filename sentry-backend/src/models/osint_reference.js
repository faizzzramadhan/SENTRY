"use strict";

module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "osint_reference",
    {
      osint_reference_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      laporan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      osint_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      reference_source: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "AUTO",
      },

      reference_status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "REVIEW",
      },

      reference_method: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "KEYWORD_LOCATION_TIME_RULE",
      },

      matched_keywords: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      keyword_match_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "NONE",
      },

      event_match_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "NONE",
      },

      location_match_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "NONE",
      },

      time_match_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "NONE",
      },

      laporan_event_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      osint_event_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      time_diff_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      laporan_latitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true,
      },

      laporan_longitude: {
        type: DataTypes.DECIMAL(9, 6),
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

      distance_km: {
        type: DataTypes.DECIMAL(8, 3),
        allowNull: true,
      },

      laporan_area_text: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      osint_area_text: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      reference_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      reference_raw_json: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },

      verified_by: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      verified_at: {
        type: DataTypes.DATE,
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
      tableName: "osint_reference",
      timestamps: false,
    }
  );
};