const { DataTypes } = require("sequelize");

module.exports = async function (sequelize) {
  const User = sequelize.define("Rating", {
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    rate: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });
};
