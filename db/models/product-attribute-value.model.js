const { DataTypes } = require("sequelize");

module.exports = async function(sequelize){
    const ProductAttributeValue = sequelize.define("ProductAttributeValue", {
        value: {
            type: DataTypes.STRING(255),
            allowNull: false
        }
    });
}