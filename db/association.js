const SequelizeSlugify = require("sequelize-slugify");

module.exports = async function (sequelize) {
  const {
    Product,
    Order,
    User,
    OrderItem,
    Cart,
    CartItem,
    Category,
    Author,
    Rating
  } = sequelize.models;

  SequelizeSlugify.slugifyModel(Product, {
    source: ["name"],
    bulkUpdate: true
  });

  Category.belongsTo(Category, { as: "parent", foreignKey: "parentID" });
  Category.hasMany(Category, { as: "children", foreignKey: "parentID" });

  Product.belongsTo(Category);
  Product.belongsToMany(Author, { through: "AuthorProduct" });
  Author.belongsToMany(Product, { through: "AuthorProduct" });

  User.hasMany(Order);
  Order.belongsTo(User);

  Product.hasMany(Rating);
  Rating.belongsTo(Product);
  User.hasOne(Rating);
  Rating.belongsTo(User);

  Product.belongsToMany(User, { through: "Wishlist" });
  User.belongsToMany(Product, { through: "Wishlist" });

  Product.belongsToMany(Order, { through: OrderItem });
  Order.belongsToMany(Product, { through: OrderItem });

  Cart.belongsToMany(Product, { through: CartItem });
  Product.belongsToMany(Cart, { through: CartItem });

  User.hasOne(Cart);
};
