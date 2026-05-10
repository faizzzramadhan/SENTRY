"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class log_aktivitas extends Model {
    static associate(models) {
      log_aktivitas.belongsTo(models.user, {
        foreignKey: "usr_id",
        targetKey: "usr_id",
        as: "user",
      });
    }
  }

  log_aktivitas.init(
    {
      log_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "log_id",
      },

      usr_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "usr_id",
      },

      nama_user: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "nama_user",
      },

      role: {
        type: DataTypes.ENUM("staff", "admin"),
        allowNull: false,
        field: "role",
      },

      nama_aktivitas: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "nama_aktivitas",
      },

      waktu_aktivitas: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "waktu_aktivitas",
      },
    },
    {
      sequelize,
      modelName: "log_aktivitas",
      tableName: "log_aktivitas",
      timestamps: false,
    }
  );

  return log_aktivitas;
};