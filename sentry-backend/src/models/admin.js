'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class admin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  admin.init(
    {
      adm_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "ADM_ID",
      },
      adm_nama_lengkap: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: "ADM_NAMA_LENGKAP",
      },
      adm_email: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "ADM_EMAIL",
      },
      adm_no_hp: {
        type: DataTypes.STRING(15),
        allowNull: false,
        field: "ADM_NO_HP",
      },
      adm_password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "ADM_PASSWORD",
      },
      created_by: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "CREATED_BY",
      },
      creation_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "CREATION_DATE",
      },
      last_updated_by: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "LAST_UPDATED_BY",
      },
      last_update_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "LAST_UPDATE_DATE",
      },
    },
    {
      sequelize,
      modelName: "admin",
      tableName: "admin",
      timestamps: false, // karena kamu pakai kolom custom
    }
  );

  return admin;
};