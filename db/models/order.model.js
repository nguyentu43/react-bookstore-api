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
        total: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false
        },
        status: {
            type: DataTypes.STRING(255),
            default: "created"
        },
        paymentID: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    });
};