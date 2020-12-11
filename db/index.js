const { Sequelize } = require("sequelize");
const sequelize = new Sequelize("postgres://postgres:123456@localhost:5432/bookstore", {
    //logging: false
});

const models = [
    require("./models/user.model"),
    require("./models/product.model"),
    require("./models/category.model"),
    require("./models/author.model"),
    require("./models/cart.model"),
    require("./models/cart-item.model"),
    require("./models/order.model"),
    require("./models/order-item.model")
];

for(const model of models){
    model(sequelize);
}

require("./association")(sequelize);
require("./init")(sequelize);

module.exports = sequelize;