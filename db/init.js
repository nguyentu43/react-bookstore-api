const faker = require("faker");
const bcrypt = require("bcrypt");

module.exports = async function(sequelize){

    const { User, Product, Author, Category, Format } = sequelize.models;

    await sequelize.sync({ force: true });

    const hash = await bcrypt.hash("123456", 10);

    const admin = await User.create({
        name: "Admin",
        email: "ngoctu.tu1@gmail.com",
        password: hash,
        isAdmin: true
    });

    await admin.createCart();

    await Author.create({ name: 'Conan' });

    const c1 = await Category.create({name: 'Van hoc'});
    const c2 = await Category.create({name: 'Ngoai 1'});
    const c3 = await Category.create({name: 'Ngoai 2'});
    await c1.addChildren([c2, c3]);

    for(let i = 0; i<2; ++i){
        await User.create({
            name: faker.name.findName(),
            email: faker.internet.email(),
            password: hash
        });
    }

    for(let i = 0; i<10; ++i){
        const product = await Product.create({
            name: faker.vehicle.vehicle(),
            description: faker.lorem.paragraphs(19),
            price: 9.78,
            discount: 0.3,
            images: JSON.stringify(["97_2_rhxhus"])
        });
    }

    // const adminCart = await admin.getCart();
    // await adminCart.addProducts([1, 2, 3], { through: { quantity: 10 } });

    // for(let i = 0; i<5; ++i){
    //     const order = await admin.createOrder({
    //         name: faker.name.findName(),
    //         address: faker.address.city(),
    //         total: faker.random.number({ min: 10, max: 100 }),
    //         status: "charged",
    //         paymentID: "1234ABC"
    //     });

    //     order.changed("createdAt", true);
    //     order.set("createdAt", faker.date.between("2020-01-01", "2020-12-01"), { raw: true });
    //     await order.save();

    //     await order.addProduct(1, { through: { quantity: 3, discount: 0, price: 19.9 } });
    //     await order.addProduct(2, { through: { quantity: 5, discount: 0, price: 23 } });
    //     await order.addProduct(3, { through: { quantity: 2, discount: 0, price: 9 } });
    // }
};