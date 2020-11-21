const { DataTypes } = require("sequelize");

module.exports = async function(sequelize){
    const ProductAttribute = sequelize.define("ProductAttribute", {
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        }
    });
}