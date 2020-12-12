const { DataTypes, Deferrable } = require("sequelize");

module.exports = async function(sequelize){
    const Category = sequelize.define("Category", {
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        icon: {
            type: DataTypes.STRING,
            defaultValue: 'FcBookmark'
        },
        parentID: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    });
}