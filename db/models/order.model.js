const { DataTypes } = require("sequelize");

module.exports = async function(sequelize){
    
    const Order = sequelize.define("Order", {
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        address: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        totalPrice: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        status: {
            type: DataTypes.STRING(255),
            default: "Created"
        }
    });
};