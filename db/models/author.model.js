const { DataTypes } = require("sequelize");

module.exports = async function (sequelize) {
  const Author = sequelize.define("Author", {
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.TEXT,
    },
  });
};
