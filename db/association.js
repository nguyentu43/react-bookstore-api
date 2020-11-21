const SequelizeSlugify = require("sequelize-slugify");

module.exports = async function(sequelize){
    const { Product, ProductAttribute, 
        ProductAttributeValue, Order, User, OrderItem, Cart, CartItem } = sequelize.models

    SequelizeSlugify.slugifyModel(Product, {
        source: [ "name" ]
    });

    Product.belongsToMany(ProductAttribute, { through: ProductAttributeValue });
    ProductAttribute.belongsToMany(Product, { through: ProductAttributeValue });

    User.hasMany(Order);
    Order.belongsTo(User);

    Product.belongsToMany(Order, { through: OrderItem });
    Order.belongsToMany(Product, { through: OrderItem });

    Cart.belongsToMany(Product, { through: CartItem });
    Product.belongsToMany(Cart, { through: CartItem });

    User.hasOne(Cart);

}