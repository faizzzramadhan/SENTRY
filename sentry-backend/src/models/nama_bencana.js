'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class nama_bencana extends Model {
    static associate(models) {
      nama_bencana.belongsTo(models.jenis_bencana, {
        foreignKey: "jenis_id",
        targetKey: "jenis_id",
        as: "jenis_bencana",
      });
    }
  }

  nama_bencana.init(
    {
      bencana_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "bencana_id",
      },
      jenis_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "jenis_id",
      },
      nama_bencana: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "nama_bencana",
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
      modelName: "nama_bencana",
      tableName: "nama_bencana",
      timestamps: false,
    }
  );

  return nama_bencana;
};