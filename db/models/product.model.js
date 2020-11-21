const { DataTypes } = require("sequelize");

module.exports = async function(sequelize){
    const Product = sequelize.define("Product", {
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        price: {
            type: DataTypes.BIGINT,
            allowNull: false,
            validate: {
                min: 0
            }
        },
        discount: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
            validate: {
                min: 0
            }
        },
        description: {
            type: DataTypes.TEXT,
            defaultValue: "No description"
        },
        slug: {
            type: DataTypes.STRING,
            unique: true
        },
        coverImage: {
            type: DataTypes.TEXT
        },
        previewImages: {
            type: DataTypes.TEXT,
            get(){
                return this.getDataValue("previewImages") ? this.getDataValue("previewImages").split(",") : []
            }
        }
    });
}