const { DataTypes } = require("sequelize");

module.exports = async function (sequelize) {
  sequelize.define("User", {
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
      allowNull: true,
    },
    provider: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    }
  });
};
