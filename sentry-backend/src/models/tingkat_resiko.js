"use strict";

module.exports = (sequelize, DataTypes) => {
  const tingkat_resiko = sequelize.define(
    "tingkat_resiko",
    {
      resiko_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      jenis_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      kelurahan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tingkat_resiko: {
        type: DataTypes.ENUM("RENDAH", "SEDANG", "TINGGI"),
        allowNull: false,
      },
    },
    {
      tableName: "tingkat_resiko",
      timestamps: false,
    }
  );

  tingkat_resiko.associate = function(models) {
    if (models.jenis_bencana) {
      tingkat_resiko.belongsTo(models.jenis_bencana, {
        foreignKey: "jenis_id",
        targetKey: "jenis_id",
      });
    }

    if (models.data_kelurahan) {
      tingkat_resiko.belongsTo(models.data_kelurahan, {
        foreignKey: "kelurahan_id",
        targetKey: "kelurahan_id",
      });
    }
  };

  return tingkat_resiko;
};
