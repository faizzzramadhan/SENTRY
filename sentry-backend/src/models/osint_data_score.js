"use strict";

module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "osint_data_score",
    {
      osint_data_score_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      osint_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      keyword_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      keyword_level: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      keyword_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      location_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      location_level: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      location_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      time_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      time_level: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      time_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      engagement_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      engagement_level: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      engagement_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      total_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      max_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
      },

      score_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      score_level: {
        type: DataTypes.ENUM("TIDAK_VALID", "RENDAH", "SEDANG", "TINGGI"),
        allowNull: false,
        defaultValue: "RENDAH",
      },

      score_status: {
        type: DataTypes.ENUM("VALID", "NEED_REVIEW", "LOW_CONFIDENCE", "REJECTED"),
        allowNull: false,
        defaultValue: "NEED_REVIEW",
      },

      scoring_method: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "OSINT_MAPPING_SCORE_DATA_KEYWORD",
      },

      scoring_version: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "v3",
      },

      scoring_detail: {
        type: DataTypes.TEXT,
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
      tableName: "osint_data_score",
      timestamps: false,
    }
  );
};