const { DataTypes } = require("sequelize");

module.exports = async function (sequelize) {
  const User = sequelize.define("User", {
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [5, 25],
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    password: {
      type: DataTypes.STRING(65),
      allowNull: false,
    },
    resetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    resetTokenExpired: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });
};
