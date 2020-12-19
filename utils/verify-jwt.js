const jwt = require("jsonwebtoken");
const sendError = require("./send-error");
module.exports = function (sequelize) {
  return async function (req, res, next) {
    if (!req.headers["authorization"]) return next();
    const token = req.headers["authorization"].split(" ")[1];
    if (!token) return next();

    try {
      const authData = jwt.verify(token, "privatekey");
      const user = await sequelize.models.User.findByPk(Number(authData.id));
      req.user = user;
      next();
    } catch (e) {
      res.status(401).json({ message: "A token is invalid" });
    }
  };
};
