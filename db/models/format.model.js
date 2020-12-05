const { DataTypes } = require("sequelize");

module.exports = async function(sequelize){
    const Format = sequelize.define("Format", {
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        }
    });
}