const { Sequelize } = require("sequelize");
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    logging: false
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

module.exports = sequelize;