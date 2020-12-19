const { DataTypes } = require("sequelize");

module.exports = async function (sequelize) {
  const Cart = sequelize.define("Cart", {});
};
