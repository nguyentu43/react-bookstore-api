const faker = require("faker");
const bcrypt = require("bcrypt");

module.exports = async function(sequelize){

    const { User, ProductAttribute, Product } = sequelize.models;

    await sequelize.sync({ force: true });

    const hash = await bcrypt.hash("123456", 10);

    const admin = await User.create({
        name: "Admin",
        email: "admin@bookstore.local",
        password: hash,
        isAdmin: true
    });

    await admin.createCart();

    for(let i = 0; i<2; ++i){
        await User.create({
            name: faker.name.findName(),
            email: faker.internet.email(),
            password: hash
        });
    }

    const attrs = await ProductAttribute.bulkCreate([
        { name: "Danh mục" },
        { name: "Tác giả" },
        { name: "Thể loại" },
        { name: "Số trang" },
        { name: "Ngày xuất bản" }
    ]);

    for(let i = 0; i<5; ++i){

        const product = await Product.create({
            name: faker.vehicle.vehicle(),
            description: faker.lorem.paragraphs(2),
            price: 100000,
            discount: 0,
            coverImage: "97_2_rhxhus",
            previewImages: "hpr3blkcpzhowykqpqtd,hpr3blkcpzhowykqpqtd"
        });
        
        for(const attr of attrs){
            await product.addProductAttribute(attr, { through: { value: faker.name.jobTitle() } });
        }
    }

    const adminCart = await admin.getCart();
    await adminCart.addProducts([1, 2, 3], { through: { quantity: 10 } });

};