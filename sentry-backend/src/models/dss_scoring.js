'use strict';

module.exports = (sequelize, DataTypes) => {
  return sequelize.define("dss_scoring", {
    dss_scoring_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    laporan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    humint_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    osint_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    spatial_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: "dss_scoring",
    timestamps: false,
  });
};