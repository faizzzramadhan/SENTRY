"use strict";

module.exports = (sequelize, DataTypes) => {
  const osint_reference = sequelize.define(
    "osint_reference",
    {
      osint_reference_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      laporan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
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

  osint_reference.associate = function(models) {
    if (models.laporan) {
      osint_reference.belongsTo(models.laporan, {
        foreignKey: "laporan_id",
        targetKey: "laporan_id",
        as: "laporan",
      });
    }
  };

  return osint_reference;
};
