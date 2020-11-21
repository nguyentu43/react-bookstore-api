const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { QueryTypes } = require("sequelize");
const sendError = require("../utils/send-error");
const cloudinary = require("cloudinary").v2;
cloudinary.config({
    api_key: "486491292758638",
    api_secret: "V09vhr9OOqkmV4SDDEyM8lf3GDc",
    cloud_name: "dqwgxcnh7"
});

module.exports = function(sequelize){

    const { checkAdmin, checkAuthAndGet } = require("../utils/auth")(sequelize);

    const { User, Product, ProductAttribute, Order } = sequelize.models;

    const buildJSONProduct = function(p){
        const p_json = p.toJSON();
        p_json.coverImage = cloudinary.url(p_json.coverImage, { secure: true });
        p_json.previewImages = p_json.previewImages.map(item => cloudinary.url(item, { secure: true }));
        if(p_json.ProductAttributes){
            p_json.attributes = p_json.ProductAttributes.map(attr => {
                return {
                    ...attr,
                    value: attr.ProductAttributeValue.value
                }
            });
        }
        return p_json;
    }
    
    const buildJSONOrder = function(order){
        const items = order.Products.map(item => {
            return {
                ...item.toJSON(),
                quantity: item.OrderItem.quantity
            };
        });
        return {
            ...order.toJSON(),
            userID: order.User.id,
            items
        };
    }

    return {
        async getUserInfo({}, req){
            const currentUser = await checkAuthAndGet(req);
            return {
                id: currentUser.id,
                name: currentUser.name,
                isAdmin: currentUser.isAdmin
            }
        },
        async login({ email, password }){
            const user = await User.findOne({ where: { email } });
            if(user){
                const valid = await bcrypt.compare(password, user.password);
                if(valid){
                    const token = jwt.sign({
                        id: user.id,
                        name: user.name,
                        email: user.email
                    }, "privatekey", { expiresIn: "1d" });
                    return token
                }
            }
            sendError("The user is not found", 404);
        },
        async register({ input }){

            if(!(input.password && input.password.length <=25 && input.password.length >=5)){
                sendError("Don't meet requirements", 422);
            }

            const hash = await bcrypt.hash(input.password, 10);
            input.password = hash;
            const user = await User.create(input);
            user.createCart();
    
            const token = jwt.sign({
                id: user.id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin
            }, "privatekey", { expiresIn: "1d" });
            return token;
    
        },
        async getCategories({name}){
            let attrs;
            if(name){
                attrs = await ProductAttribute.findAll({
                    where: { name }
                });
            }
            else{
                attrs = await ProductAttribute.findAll();
            }
            
            const categories = attrs.map(async attr => {

                let data = await sequelize.query('select distinct value from "ProductAttributeValues" where "ProductAttributeId" = ?', { replacements: [ attr.id ], raw: true, type: QueryTypes.SELECT });
                data = data.map(item => item.value);

                return {
                    id: attr.id,
                    name: attr.name,
                    values: data
                };
            });
        
            return categories;
        },
        async getProduct({ slug }){
            const p = await Product.findOne({ where: { slug } });
            return p ? buildJSONProduct(p) : null;
        },
        async getProducts(){
            const ps = await Product.findAll({ include: ProductAttribute });
            return ps.map(p => {
                return buildJSONProduct(p);
            });
        },
        async createUser({ input }, req){
            checkAdmin(req);
            const hash = await bcrypt.hash(input.password, 10);
            input.password = hash;
            const user = await User.create(input);
            user.createCart();
            return user.toJSON();
        },
        async createProduct({ input }, req){
            checkAdmin(req);
            const attrs = input.attributes || [];
            const product = await Product.create(input);
            for(const attr of attrs){
                await product.addProductAttribute(attr.id, { through: { value: attr.value } });
            };
            await product.reload({ include: ProductAttribute });
            return buildJSONProduct(product);
        },
        async updateProduct({ id, input }, req){
            checkAdmin(req);
            const attrs = input.attributes || [];
            const product = await Product.findByPk(id, { include: ProductAttribute });
            if(product){
                await product.update(input);
                if(product.ProductAttributes){
                    for(const item of product.ProductAttributes){
                        await item.ProductAttributeValue.destroy();
                    }
                }
                for(const attr of attrs){
                    await product.addProductAttribute(attr.id, { through: { value: attr.value } });
                };
    
                await product.reload({ include: ProductAttribute });
                return buildJSONProduct(product);
            }
    
            sendError("A product is not found", 404);
        },
        async deleteProduct({id}, req){
            checkAdmin(req);
            const numsOfDelete = await Product.destroy({ where: { id } });
            if(numsOfDelete > 0){
                return true;
            }
            sendError("Can't delete this product", 403);
        },
        async getUserCart({}, req){
            const currentUser = await checkAuthAndGet(req);
            const userCart = await currentUser.getCart();
            let cartItems = await userCart.getProducts();
            cartItems = cartItems.map(item => {
                return {
                    ...item.toJSON(),
                    quantity: item.CartItem.quantity
                };
            });
            const cartJSON = { items: cartItems };
            return cartJSON;
        },
        async addCartItem({ input }, req){
            const currentUser = await checkAuthAndGet(req);
            const userCart = await currentUser.getCart();
            const cartItems = await userCart.getProducts({ where: { id: Number( input.productID ) } });
    
            if(cartItems.length === 1){
                cartItems[0].CartItem.quantity = input.quantity;
                await cartItems[0].CartItem.save();
            }
            else{
                await userCart.addProduct(input.productID, { through: { quantity: input.quantity } });
            }
    
        },
        async removeCartItem({ productID }, req){
            const currentUser = await checkAuthAndGet(req);
            const userCart = await currentUser.getCart();
            const cartItems = await userCart.getProducts({ where: { id: Number(productID) } });
            if(cartItems.length === 1){
                await cartItems[0].CartItem.destroy();
            }
        },
        async getUserOrders({}, req){
            const currentUser = await checkAuthAndGet(req);
            const orders = await currentUser.getOrders({ include: [ Product, User ] });
            return orders.map(order => {
                return buildJSONOrder(order);
            });
        },
        async getOrders({}, req){
            await checkAdmin(req);
            const orders = await Order.findAll({ include: [ Product, User ] });
            return orders.map(order => {
                return buildJSONOrder(order);
            });
        },
        async addOrder({ userID, input }, req){

            const currentUser = await checkAuthAndGet(req);

            if(userID && userID != req.authData.id){
                await checkAdmin(req);
            }
            else{
                userID = currentUser.id;
            }
    
            const order = await Order.create(input);
            await order.setUser(Number(userID));
            for(const item of input.items){
                await order.addProduct(
                    item.productID, { through: { quantity: item.quantity, price: item.price, discount: item.discount } });
            }
            await order.reload({ include: [ Product, User] });
            return buildJSONOrder(order);
        },
        async updateOrder({ id, input }, req){
    
            await checkAdmin(req);

            const order = await Order.findOne({ where: { id }, include: Product });
            if(order){
                await order.update(input);
                for(const item of order.Products){
                    await item.OrderItem.destroy();
                }
                for(const item of input.items){
                    await order.addProduct(
                        item.productID, { through: { quantity: item.quantity, price: item.price, discount: item.discount } });
                }
                await order.reload({ include: [ Product, User ] });
    
                return buildJSONOrder(order);
    
            }
            sendError("Can't update this order", 403);
        },
        async updateOrderStatus({ id, status }, req){
            await checkAdmin(req);
            const order = await Order.findOne({ where: { id }, include: [ Product, User ] });
            if(order){
                await order.update({ status });
                return buildJSONOrder(order);
    
            }
            sendError("Can't update this order", 403);
        },
        async removeOrder({ id }, req){
            await checkAdmin(req);
            const numsOfDelete = await Order.destroy({ where: { id } });
            if(numsOfDelete > 0){
                return true;
            }
            sendError("Can't delete this product", 403);
        }
    };
}