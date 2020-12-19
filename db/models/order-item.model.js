const { DataTypes } = require("sequelize");

module.exports = async function (sequelize) {
  const DetailOrder = sequelize.define("OrderItem", {
    price: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    discount: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    quantity: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
  });
};
