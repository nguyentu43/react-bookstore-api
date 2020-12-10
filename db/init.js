const faker = require("faker");
const bcrypt = require("bcrypt");

module.exports = async function (sequelize) {
  const { User, Product, Author, Category } = sequelize.models;

  await sequelize.sync({ force: true });

  const hash = await bcrypt.hash("123456", 10);

  const admin = await User.create({
    name: "Admin",
    email: "ngoctu.tu1@gmail.com",
    password: hash,
    isAdmin: true,
  });

  await admin.createCart();

  for (let i = 0; i < 6; ++i) {
    await Author.create({ name: faker.name.lastName() });
  }

  for (let i = 0; i < 6; ++i) {
    await Category.create({ name: faker.company.companyName() });
  }

  await Category.create({ name: faker.company.companyName(), parentID: 1 });

  for (let i = 0; i < 2; ++i) {
    await User.create({
      name: faker.name.findName(),
      email: faker.internet.email(),
      password: hash,
    });
  }

  for (let i = 0; i < 20; ++i) {
    const product = await Product.create({
      name: "Book " + i,
      description: faker.lorem.paragraphs(19),
      price: 1,
      discount: 0.3,
      images: JSON.stringify([
        "store/aa3hfr9iqx3ku91ziowq",
        "store/johuq80uxbpowy39gauz",
      ]),
    });
    product.setAuthors([1, 2]);
    product.setCategory(7);
  }

  const cart = await admin.getCart();
  await cart.addProduct(1, { through: { quantity: 5 } });
  await cart.addProduct(4, { through: { quantity: 5 } });
  await cart.addProduct(2, { through: { quantity: 5 } });
  await cart.addProduct(3, { through: { quantity: 5 } });

  const order = await admin.createOrder({
    name: "Customer 1",
    address: "HCM",
    status: "created",
    total: 7,
  });
  await order.addProduct(1, {
    through: { quantity: 10, discount: 0.3, price: 1 },
  });

  const order2 = await admin.createOrder({
    name: "Customer 1",
    address: "HCM",
    status: "created",
    total: 7,
  });
  await order2.addProduct(3, {
    through: { quantity: 10, discount: 0.3, price: 1 },
  });
};
