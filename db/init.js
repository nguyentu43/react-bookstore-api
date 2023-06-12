require("dotenv").config();
const faker = require("faker");
const bcrypt = require("bcrypt");

const sequelize = require("./index");

const init = async function (sequelize) {
  const { User, Product, Author, Category } = sequelize.models;

  await sequelize.sync({ force: true });

  await sequelize.query(`CREATE INDEX product_name_fts ON "Products" USING GIN (to_tsvector('english', name));`);

  const hash = await bcrypt.hash("12345678", 10);

  const admin = await User.create({
    name: "Admin",
    email: "admin@example.com",
    password: hash,
    isAdmin: true,
  });

  const user = await User.create({
    name: "User 1",
    email: "abc@example.com",
    password: hash,
    isAdmin: false,
  });

  await admin.createCart();
  await user.createCart();

  for (let i = 0; i < 6; ++i) {
    await Author.create({ name: faker.name.lastName() });
  }

  for (let i = 0; i < 6; ++i) {
    await Category.create({ name: faker.company.companyName() });
  }

  await Category.create({ name: faker.company.companyName(), parentID: 1 });

  for (let i = 0; i < 2; ++i) {
    const user = await User.create({
      name: faker.name.findName(),
      email: faker.internet.email(),
      password: hash,
    });
    await user.createCart();
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
    phone: "23477888",
    total: 7,
  });
  await order.addProduct(1, {
    through: { quantity: 10, discount: 0.3, price: 1 },
  });

  const order2 = await admin.createOrder({
    name: "Customer 1",
    address: "HCM",
    status: "created",
    phone: "1234568",
    total: 7,
  });
  await order2.addProduct(3, {
    through: { quantity: 10, discount: 0.3, price: 1 },
  });

  console.log("Data has been created!");

  process.exit(0);
};

init(sequelize);
