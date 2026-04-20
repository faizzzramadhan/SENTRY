'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class user extends Model {
    static associate(models) {
      // define association here
    }
  }

  user.init(
    {
      usr_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "usr_id",
      },
      usr_nama_lengkap: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: "usr_nama_lengkap",
      },
      usr_email: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "usr_email",
      },
      usr_no_hp: {
        type: DataTypes.STRING(15),
        allowNull: false,
        field: "usr_no_hp",
      },
      usr_password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "usr_password",
      },
      usr_role: {
        type: DataTypes.ENUM("staff", "admin"),
        allowNull: false,
        defaultValue: "staff",
        field: "usr_role",
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
      modelName: "user",
      tableName: "user",
      timestamps: false,
    }
  );

  return user;
};