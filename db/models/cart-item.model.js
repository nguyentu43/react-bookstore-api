const { DataTypes } = require("sequelize");

module.exports = async function (sequelize) {
  const DetailCart = sequelize.define("CartItem", {
    quantity: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
  });
};
