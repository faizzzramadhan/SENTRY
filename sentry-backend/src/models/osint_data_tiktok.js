'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class osint_data_tiktok extends Model {
    static associate(models) {}
  }

  osint_data_tiktok.init(
    {
      osint_datatiktok_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "osint_datatiktok_id",
      },
      osint_account_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "osint_account_name",
      },
      osint_account_username: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "osint_account_username",
      },
      osint_location_text: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "osint_location_text",
      },
      osint_latitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true,
        field: "osint_latitude",
      },
      osint_longitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true,
        field: "osint_longitude",
      },
      osint_post_time: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "osint_post_time",
      },
      osint_tiktok_video_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "osint_tiktok_video_id",
      },
      osint_link_url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
        field: "osint_link_url",
      },
      osint_like_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "osint_like_count",
      },
      osint_share_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "osint_share_count",
      },
      osint_favourite_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "osint_favourite_count",
      },
      osint_view_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "osint_view_count",
      },
      osint_comment_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "osint_comment_count",
      },
      osint_hashtags: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "osint_hashtags",
      },
      osint_media_url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
        field: "osint_media_url",
      },
      osint_raw_json: {
        type: DataTypes.JSON,
        allowNull: true,
        field: "osint_raw_json",
      },
      osint_creation_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "osint_creation_date",
      },
      osint_last_update_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "osint_last_update_date",
      },
    },
    {
      sequelize,
      modelName: "osint_data_tiktok",
      tableName: "osint_data_tiktok",
      timestamps: false,
    }
  );

  return osint_data_tiktok;
};