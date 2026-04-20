'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class data_keyword extends Model {
    static associate(models) {
      // tidak ada relasi langsung
    }
  }

  data_keyword.init(
    {
      keyword_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "keyword_id",
      },
      keyword: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "keyword",
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
      modelName: "data_keyword",
      tableName: "data_keyword",
      timestamps: false,
    }
  );

  return data_keyword;
};