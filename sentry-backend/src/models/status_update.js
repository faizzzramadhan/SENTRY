module.exports = (sequelize, DataTypes) => {
  return sequelize.define("status_update", {
    status_update_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_laporan: DataTypes.INTEGER,
    created_at: DataTypes.DATE,
    update_at: DataTypes.DATE,
    zona_rawan_id: DataTypes.INTEGER,
    osint_reference_id: DataTypes.INTEGER,
    last_analyzed_at: DataTypes.DATE,
  }, {
    tableName: "status_update",
    timestamps: false,
  });
};