'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class jenis_bencana extends Model {
    static associate(models) {
      jenis_bencana.hasMany(models.nama_bencana, {
        foreignKey: "jenis_id",
        sourceKey: "jenis_id",
        as: "nama_bencana_list",
      });
    }
  }

  jenis_bencana.init(
    {
      jenis_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "jenis_id",
      },
      nama_jenis: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "nama_jenis",
      },
      icon_marker: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "icon_marker",
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
      modelName: "jenis_bencana",
      tableName: "jenis_bencana",
      timestamps: false,
    }
  );

  return jenis_bencana;
};