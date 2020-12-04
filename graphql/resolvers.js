const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { QueryTypes, Op } = require("sequelize");
const sendError = require("../utils/send-error");
const stripe = require("stripe")(
  "sk_test_51HqzdDEEA28cbsApIzrYfZm1kuH6k8t0pEFulUO5tBvf0ivq8YdtXVrJjzTxTiupPHmNxcdAoDaGmeJ3T7irTjj700ISoH1qy8"
);
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  api_key: "486491292758638",
  api_secret: "V09vhr9OOqkmV4SDDEyM8lf3GDc",
  cloud_name: "dqwgxcnh7",
});
const { sendMail } = require("../utils/mail");
const cryptoRandomString = require("crypto-random-string");
const moment = require("moment");

module.exports = function (sequelize) {
  const { checkAdmin, checkAuthAndGet } = require("../utils/auth")(sequelize);

  const { User, Product, ProductAttribute, Order } = sequelize.models;

  const buildJSONProduct = async function (p_json) {
    p_json.coverImage = cloudinary.url(p_json.coverImage, { secure: true });
    if (p_json.ProductAttributes) {
      p_json.attributes = p_json.ProductAttributes.map((attr) => {
        return {
          ...attr,
          value: attr.ProductAttributeValue.value,
        };
      });
    }
    return p_json;
  };

  const buildJSONOrder = function (order) {
    const items = order.Products.map((item) => {
      return {
        ...item.toJSON(),
        quantity: item.OrderItem.quantity,
      };
    });
    return {
      ...order.toJSON(),
      user: { ...order.User.toJSON(), password: "" },
      items,
    };
  };

  const buildJSONCart = async function (cart) {
    let cartItems = await cart.getProducts();
    cartItems = cartItems.map((item) => {
      return {
        ...item.toJSON(),
        quantity: item.CartItem.quantity,
      };
    });
    const cartJSON = { items: cartItems };
    return cartJSON;
  };

  return {
    async getUserInfo({}, req) {
      const currentUser = await checkAuthAndGet(req);
      return {
        id: currentUser.id,
        name: currentUser.name,
        isAdmin: currentUser.isAdmin,
        email: currentUser.email,
      };
    },
    async login({ email, password }) {
      const user = await User.findOne({ where: { email } });
      if (user) {
        const valid = await bcrypt.compare(password, user.password);
        if (valid) {
          const token = jwt.sign(
            {
              id: user.id,
              name: user.name,
              email: user.email,
            },
            "privatekey",
            { expiresIn: "1d" }
          );
          return token;
        }
      }
      sendError("User or password is not correct", 403);
    },
    async register({ input }) {
      if (
        !(
          input.password &&
          input.password.length <= 25 &&
          input.password.length >= 5
        )
      ) {
        sendError("Don't meet requirements", 422);
      }

      const hash = await bcrypt.hash(input.password, 10);
      input.password = hash;
      const user = await User.create(input);
      user.createCart();

      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
        },
        "privatekey",
        { expiresIn: "1d" }
      );
      return token;
    },
    async getCategories({ name }) {
      let attrs;
      if (name) {
        attrs = await ProductAttribute.findAll({
          where: { name },
        });
      } else {
        attrs = await ProductAttribute.findAll();
      }

      const categories = attrs.map(async (attr) => {
        let data = await sequelize.query(
          'select distinct value from "ProductAttributeValues" where "ProductAttributeId" = ?',
          { replacements: [attr.id], raw: true, type: QueryTypes.SELECT }
        );
        data = data.map((item) => item.value);

        return {
          id: attr.id,
          name: attr.name,
          values: data,
        };
      });

      return categories;
    },
    async getProduct({ slug }) {
      const p = await Product.findOne({
        where: { slug },
        include: ProductAttribute,
      });
      if (p) {
        return buildJSONProduct(p.toJSON());
      } else {
        sendError("A product is not found", 404);
      }
    },
    async getProducts({ search = "", offset, limit }) {
      const params = search.split("&");
      let searchParam = "";
      let attrParams = [];
      let orderSQL = 'order by "Products"."createdAt" desc';
      let paramSQL = "";

      for (const param of params) {
        const sp = param.split("=");
        switch (sp[0]) {
          case "order":
            switch (Number(sp[1])) {
              case 0:
                orderSQL =
                  'group by "Products".id order by coalesce(sum("OrderItems".quantity), 0) desc';
                break;
              case 1:
                orderSQL = 'order by "Products"."createdAt" desc';
                break;
              case 2:
                orderSQL =
                  'order by "Products".price * (1 - "Products".discount) desc';
                break;
              case 3:
                orderSQL =
                  'order by "Products".price * (1 - "Products".discount) asc';
                break;
            }
            break;
          case "search":
            searchParam = sp[1];
            break;
          case "attr":
            const [id, value] = sp[1].split("$$");
            attrParams = attrParams.concat([Number(id), value]);
            if (paramSQL === "") {
              paramSQL =
                '("ProductAttributeValues"."ProductAttributeId" = ? and "ProductAttributeValues".value = ?)';
            } else {
              paramSQL +=
                ' or ("ProductAttributeValues"."ProductAttributeId" = ? and "ProductAttributeValues".value = ?)';
            }
            break;
          default:
            break;
        }
      }

      searchParam = "%" + searchParam.toUpperCase() + "%";

      let sql = `select distinct "Products".* ${
        orderSQL.includes("group by")
          ? ', coalesce(sum("OrderItems".quantity), 0)'
          : ""
      } from "Products" left join "ProductAttributeValues" on "Products".id = "ProductAttributeValues"."ProductId" left join "OrderItems" on "Products".id = "OrderItems"."ProductId" where upper("Products".name) like ? ${
        paramSQL ? "and (" + paramSQL + ")" : ""
      } ${orderSQL}`;

      if (offset) {
        sql += " offset ?";
        attrParams.push(offset);
      }

      if (limit) {
        sql += " limit ?";
        attrParams.push(limit);
      }

      const ps = await sequelize.query(sql, {
        model: Product,
        mapToModel: true,
        type: QueryTypes.SELECT,
        replacements: [searchParam, ...attrParams],
      });

      return ps.map(async (p) => {
        const p_json = p.toJSON();
        p_json.ProductAttributes = await p.getProductAttributes({});
        p_json.ProductAttributes = p_json.ProductAttributes.map((item) =>
          item.toJSON()
        );
        return buildJSONProduct(p_json);
      });
    },
    async createUser({ input }, req) {
      checkAdmin(req);
      const hash = await bcrypt.hash(input.password, 10);
      input.password = hash;
      const user = await User.create(input);
      user.createCart();
      return user.toJSON();
    },
    async createProduct({ input }, req) {
      checkAdmin(req);
      const attrs = input.attributes || [];
      const product = await Product.create(input);
      for (const attr of attrs) {
        await product.addProductAttribute(attr.id, {
          through: { value: attr.value },
        });
      }
      await product.reload({ include: ProductAttribute });
      return buildJSONProduct(product.toJSON());
    },
    async updateProduct({ id, input }, req) {
      checkAdmin(req);
      const attrs = input.attributes || [];
      const product = await Product.findByPk(id, { include: ProductAttribute });
      if (product) {
        await product.update(input);
        if (product.ProductAttributes) {
          for (const item of product.ProductAttributes) {
            await item.ProductAttributeValue.destroy();
          }
        }
        for (const attr of attrs) {
          await product.addProductAttribute(attr.id, {
            through: { value: attr.value },
          });
        }

        await product.reload({ include: ProductAttribute });
        return buildJSONProduct(product.toJSON());
      }

      sendError("A product is not found", 404);
    },
    async deleteProduct({ id }, req) {
      checkAdmin(req);
      const numsOfDelete = await Product.destroy({ where: { id } });
      if (numsOfDelete > 0) {
        return true;
      }
      sendError("Can't delete this product", 403);
    },
    async getUserCart({}, req) {
      const currentUser = await checkAuthAndGet(req);
      const userCart = await currentUser.getCart();
      return await buildJSONCart(userCart);
    },
    async addCartItem({ input }, req) {
      const currentUser = await checkAuthAndGet(req);
      const userCart = await currentUser.getCart();
      const cartItems = await userCart.getProducts({
        where: { id: Number(input.id) },
      });

      if (cartItems.length === 1) {
        cartItems[0].CartItem.quantity = input.quantity;
        await cartItems[0].CartItem.save();
      } else {
        await userCart.addProduct(input.id, {
          through: { quantity: input.quantity },
        });
      }

      return await buildJSONCart(userCart);
    },
    async removeCartItem({ productID }, req) {
      const currentUser = await checkAuthAndGet(req);
      const userCart = await currentUser.getCart();
      const cartItems = await userCart.getProducts({
        where: { id: Number(productID) },
      });
      if (cartItems.length === 1) {
        await cartItems[0].CartItem.destroy();
      }

      return await buildJSONCart(userCart);
    },
    async getUserOrders({}, req) {
      const currentUser = await checkAuthAndGet(req);
      const orders = await currentUser.getOrders({ include: [Product, User] });
      return orders.map((order) => {
        return buildJSONOrder(order);
      });
    },
    async getOrders({}, req) {
      await checkAdmin(req);
      const orders = await Order.findAll({ include: [Product, User] });
      return orders.map((order) => {
        return buildJSONOrder(order);
      });
    },
    async addOrder({ userID, input }, req) {
      const currentUser = await checkAuthAndGet(req);
      let status = "created";
      if (userID && userID != req.authData.id) {
        await checkAdmin(req);
      } else {
        userID = currentUser.id;
        userCart = await currentUser.getCart();
        for (const p of await userCart.getProducts()) {
          await p.CartItem.destroy();
        }
        status = "charged";
      }
      const order = await Order.create({ ...input, status });
      await order.setUser(Number(userID));
      for (const item of input.items) {
        await order.addProduct(item.id, {
          through: {
            quantity: item.quantity,
            price: item.price,
            discount: item.discount,
          },
        });
      }
      await order.reload({ include: [Product, User] });
      return buildJSONOrder(order);
    },
    async updateOrder({ id, input }, req) {
      await checkAdmin(req);
      const order = await Order.findOne({ where: { id }, include: Product });
      if (order) {
        await order.update(input);
        for (const item of order.Products) {
          await item.OrderItem.destroy();
        }
        for (const item of input.items) {
          await order.addProduct(item.id, {
            through: {
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
            },
          });
        }
        await order.reload({ include: [Product, User] });
        return buildJSONOrder(order);
      }
      sendError("Can't update this order", 403);
    },
    async updateOrderStatus({ id, status }, req) {
      await checkAuthAndGet(req);
      //await checkAdmin(req);
      const order = await Order.findOne({
        where: { id },
        include: [Product, User],
      });
      if (order) {
        await order.update({ status });
        return buildJSONOrder(order);
      }
      sendError("Can't update this order", 403);
    },
    async removeOrder({ id }, req) {
      await checkAdmin(req);
      const numsOfDelete = await Order.destroy({ where: { id } });
      if (numsOfDelete > 0) {
        return true;
      }
      sendError("Can't delete this product", 403);
    },
    async getPaymentCode({ amount, currency = "usd" }, req) {
      await checkAuthAndGet(req);
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method_types: ["card"],
      });
      return paymentIntent.client_secret;
    },
    async requestResetPassword({ email }) {
      const user = await User.findOne({ where: { email } });
      const randomString = cryptoRandomString({ length: 25 });
      const host = "http://localhost:3000";
      const link = host + "/auth/reset-password/" + randomString;
      if (user) {
        await sendMail(
          user.email,
          "Reset Password",
          `<a href="${link}">Reset Password</a>`
        );
        await user.update({
          resetToken: randomString,
          resetTokenExpired: moment().add(2, 'd'),
        });
      }
    },
    async verifyTokenAndResetPassword({ token, password }) {
      const user = await User.findOne({
        where: { resetToken: token, resetTokenExpired: { [ Op.gte ]: moment() } }
      });

      if(user){
        const hash = await bcrypt.hash(password, 10);
        await user.update({ resetTokenExpired: null, resetToken: null, password: hash });
      }
      else{
          sendError("Token is invalid", 403);
      }
    },
    async getChartData({year = 2020}, req){
      await checkAdmin(req);
      const dataByOrder = await sequelize.query(`
      select extract(month from "createdAt") as month, sum("totalPrice"), count("id")
      from "Orders"
      where extract(year from "createdAt") = ?
      group by extract(month from "createdAt")`, { replacements: [year], type: QueryTypes.SELECT });

      const dataByProduct = await sequelize.query(`select "Products".id, "Products".name, sum("quantity") as quantity, sum("OrderItems".price * (1 - "OrderItems".discount) * "OrderItems".quantity) as total
      from "OrderItems" join "Products" on "OrderItems"."ProductId" = "Products".id
      where extract(year from "OrderItems"."createdAt") = ?
      group by "Products".id
      order by sum("quantity") desc
	  limit 10`, { replacements: [year], type: QueryTypes.SELECT });

      const dataByTotal = await sequelize.query(`select extract(month from "Orders"."createdAt") as month, avg("totalPrice"), min("totalPrice"), max("totalPrice")
      from "Orders"
      where extract(year from "Orders"."createdAt") = ?
      group by extract(month from "Orders"."createdAt"), "Orders"."UserId"`, { replacements: [year], type: QueryTypes.SELECT });

      return JSON.stringify({ dataByOrder, dataByProduct, dataByTotal });
    }
  };
};
