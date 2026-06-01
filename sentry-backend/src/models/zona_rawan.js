module.exports = (sequelize, DataTypes) => {

  const ZonaRawan =
    sequelize.define(

      'zona_rawan',

      {

        zona_id: {

          type: DataTypes.INTEGER,

          primaryKey: true,

          autoIncrement: true
        },

        id_upload: {

          type: DataTypes.INTEGER,

          allowNull: true
        },

        jenis_id: {

          type: DataTypes.INTEGER,

          allowNull: false
        },

        kelurahan_id: {

          type: DataTypes.INTEGER,

          allowNull: true
        },

        nama_zona: {

          type: DataTypes.STRING,

          allowNull: false
        },

        geojson: {

          type: DataTypes.TEXT('long'),

          allowNull: false
        },

        tingkat_resiko: {

          type: DataTypes.ENUM(

            'RENDAH',

            'SEDANG',

            'TINGGI'

          ),

          allowNull: false
        },

        warna: {

          type: DataTypes.STRING,

          defaultValue: 'red'
        },

        uploaded_by: {

          type: DataTypes.STRING
        },

        // =========================
        // STATUS ZONA
        // =========================

        status: {

          type: DataTypes.ENUM(

            'AKTIF',

            'NONAKTIF'
          ),

          defaultValue:
            'AKTIF'
        },

        // =========================
        // SUMBER DATA
        // =========================

        sumber_data: {

          type: DataTypes.ENUM(

            'DEFAULT',

            'MANUAL'
          ),

          defaultValue:
            'MANUAL'
        }

      },

      {

        tableName: 'zona_rawan',

        timestamps: false
      }
    )

  return ZonaRawan
}