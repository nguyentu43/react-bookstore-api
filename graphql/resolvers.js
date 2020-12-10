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
const { isArray } = require("lodash");
const { GraphQLUpload } = require("graphql-upload");
const { request } = require("express");

module.exports = function (sequelize) {
  const { User, Product, Order, Category, Author } = sequelize.models;

  function cartToJSON(items){
    return items.map(item => ({
      ...item.toJSON(),
      images: item.images.map(image => cloudinary.url(image, { secure: true })),
      quantity: item.CartItem.quantity
    }));
  }

  function productToJSON(product){
    return {
      ...product.toJSON(),
      category: product.Category.toJSON(),
      images: product.images.map(image => ({ public_id: image, secure_url: cloudinary.url(image, { secure: true }) })),
      authors: product.Authors.map(a => a.toJSON())
    }
  }

  return {
    Upload: GraphQLUpload,
    async getImages({ next_cursor }) {
      const max_results = 10;
      try {
        const result = await cloudinary.api.resources({
          type: "upload",
          next_cursor,
          max_results,
          prefix: "store/",
        });

        return {
          list: result.resources.map(({ public_id, secure_url }) => ({
            public_id,
            secure_url,
          })),
          next_cursor: result.next_cursor,
        };
      } catch (error) {
        sendError(error.code, 403);
      }
    },
    async uploadImages({ files: uploadFiles }) {
      function handleUpload(readStream) {
        return new Promise(function (resolve, reject) {
          const uploadStream = cloudinary.uploader.upload_stream(
            { format: "jpg", folder: "store" },
            function (error, result) {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          readStream.pipe(uploadStream);
        });
      }

      const uploadPromises = [];
      for (const { promise } of uploadFiles) {
        const file = await promise;
        if (
          ["image/png", "image/jpeg", "image/gif"].indexOf(file.mimetype) === -1
        )
          return;
        uploadPromises.push(handleUpload(file.createReadStream()));
      }

      try {
        const results = await Promise.all(uploadPromises);
        return results.map(({ public_id, secure_url }) => ({
          public_id,
          secure_url,
        }));
      } catch (error) {
        console.log(error);
        sendError("Upload Error", 500);
      }
    },
    async removeImages({ public_ids }) {
      const deletePromises = [];
      for (const item of public_ids) {
        deletePromises.push(cloudinary.uploader.destroy(item));
      }

      try {
        const results = await Promise.all(deletePromises);
        return true;
      } catch (err) {
        sendError("Delete Error", 500);
      }
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
      const categories = await Category.findAll({
        include: [{all: true, nested: true}],
      });
      return categories.map((category) => category.toJSON());
    },
    async createCategory({ input }) {
      const category = await Category.create({ ...input });
      return category.toJSON();
    },
    async updateCategory({ id, input }) {
      const result = await Category.update({ ...input }, { where: { id } });
      if (result) {
        return (
          await Category.findByPk(id, {
            include: { all: true, nested: true },
          })
        ).toJSON();
      } else {
        sendError("Category is not found", 404);
      }
    },
    async removeCategory({ id }) {
      const result = await Category.destroy({ where: { id } });
      if (result) {
        return true;
      } else {
        sendError("Category is not found", 404);
      }
    },
    async getAuthors() {
      const authors = await Author.findAll({});
      return authors.map((author) => author.toJSON());
    },
    async createAuthor({ input }) {
      const author = await Author.create({ ...input });
      return author.toJSON();
    },
    async updateAuthor({ id, input }) {
      const result = await Author.update({ ...input }, { where: { id } });
      if (result) {
        return (await Author.findByPk(id)).toJSON();
      } else {
        sendError("Author is not found", 404);
      }
    },
    async removeAuthor({ id }) {
      const result = await Author.destroy({ where: { id } });
      if (result) {
        return true;
      } else {
        sendError("Author is not found", 404);
      }
    },
    async getProduct({ slug }) {
      const p = await Product.findOne({
        where: { slug },
        include: { all: true, nested: true },
      });
      if (p) {
        return productToJSON(p);
      } else {
        sendError("Product is not found", 404);
      }
    },
    async getProducts({ search = "", offset, limit }) {
      const products = await Product.findAll(
        {},
        { include: [Author, Category, "relatedProduct"] }
      );
      return products.map((product) => product.toJSON());

      // const params = search.split("&");
      // let searchParam = "";
      // let attrParams = [];
      // let orderSQL = 'order by "Products"."createdAt" desc';
      // let paramSQL = "";

      // for (const param of params) {
      //   const sp = param.split("=");
      //   switch (sp[0]) {
      //     case "order":
      //       switch (Number(sp[1])) {
      //         case 0:
      //           orderSQL =
      //             'group by "Products".id order by coalesce(sum("OrderItems".quantity), 0) desc';
      //           break;
      //         case 1:
      //           orderSQL = 'order by "Products"."createdAt" desc';
      //           break;
      //         case 2:
      //           orderSQL =
      //             'order by "Products".price * (1 - "Products".discount) desc';
      //           break;
      //         case 3:
      //           orderSQL =
      //             'order by "Products".price * (1 - "Products".discount) asc';
      //           break;
      //       }
      //       break;
      //     case "search":
      //       searchParam = sp[1];
      //       break;
      //     case "attr":
      //       const [id, value] = sp[1].split("$$");
      //       attrParams = attrParams.concat([Number(id), value]);
      //       if (paramSQL === "") {
      //         paramSQL =
      //           '("ProductAttributeValues"."ProductAttributeId" = ? and "ProductAttributeValues".value = ?)';
      //       } else {
      //         paramSQL +=
      //           ' or ("ProductAttributeValues"."ProductAttributeId" = ? and "ProductAttributeValues".value = ?)';
      //       }
      //       break;
      //     default:
      //       break;
      //   }
      // }

      // searchParam = "%" + searchParam.toUpperCase() + "%";

      // let sql = `select distinct "Products".* ${
      //   orderSQL.includes("group by")
      //     ? ', coalesce(sum("OrderItems".quantity), 0)'
      //     : ""
      // } from "Products" left join "ProductAttributeValues" on "Products".id = "ProductAttributeValues"."ProductId" left join "OrderItems" on "Products".id = "OrderItems"."ProductId" where upper("Products".name) like ? ${
      //   paramSQL ? "and (" + paramSQL + ")" : ""
      // } ${orderSQL}`;

      // if (offset) {
      //   sql += " offset ?";
      //   attrParams.push(offset);
      // }

      // if (limit) {
      //   sql += " limit ?";
      //   attrParams.push(limit);
      // }

      // const ps = await sequelize.query(sql, {
      //   model: Product,
      //   mapToModel: true,
      //   type: QueryTypes.SELECT,
      //   replacements: [searchParam, ...attrParams],
      // });

      // return ps.map(async (p) => {
      //   const p_json = p.toJSON();
      //   p_json.ProductAttributes = await p.getProductAttributes({});
      //   p_json.ProductAttributes = p_json.ProductAttributes.map((item) =>
      //     item.toJSON()
      //   );
      //   return buildJSONProduct(p_json);
      // });
    },
    async createProduct({ input }) {
      const product = await Product.create(input);
      await product.setCategory(input.category);
      if (isArray(input.authors)) {
        await product.addAuthors(input.authors);
      }
      return product.toJSON();
    },
    async updateProduct({ id, input }) {
      const result = await Product.update(input, { where: { id } });
      if (result) {
        const product = await Product.findByPk(id);
        await product.setCategory(input.category);
        if (isArray(input.authors)) {
          await product.setAuthors([]);
          await product.addAuthors(input.authors);
        }
        return product.toJSON();
      } else {
        sendError("A product is not found", 404);
      }
    },
    async deleteProduct({ id }) {
      const numsOfDelete = await Product.destroy({ where: { id } });
      if (numsOfDelete > 0) {
        return true;
      }
      sendError("Can't delete this product", 403);
    },
    async createUser({ input }) {
      const hash = await bcrypt.hash(input.password, 10);
      input.password = hash;
      const user = await User.create(input);
      user.createCart();
      return user.toJSON();
    },
    async getUserCart({}, req) {
      const currentUser = req.user;
      const userCart = await currentUser.getCart();
      const items = await userCart.getProducts();
      return cartToJSON(items);
    },
    async getUserInfo({}, req) {
      const currentUser = req.user;
      return {
        id: currentUser.id,
        name: currentUser.name,
        isAdmin: currentUser.isAdmin,
        email: currentUser.email,
      };
    },
    async getWishlist({}, req) {
      const currentUser = req.user;
      return await currentUser.getProducts();
    },
    async addWishlist({ id }, req) {
      return await req.user.addProduct(id);
    },
    async removeWishlist({ id }, req) {
      return await req.user.removeProduct(id);
    },
    async addCartItem({ input: { id, quantity }}, req) {
      const currentUser = req.user;
      const userCart = await currentUser.getCart();
      const cartItems = await userCart.getProducts({
        where: { id: Number(id) },
      });

      if (cartItems.length === 1) {
        await cartItems[0].CartItem.update({ quantity });
      } else {
        await userCart.addProduct(id, {
          through: { quantity },
        });
      }

      return cartToJSON(await userCart.getProducts());
    },
    async removeCartItem({ productID }, req) {
      const currentUser = req.user;
      const userCart = await currentUser.getCart();
      const cartItems = await userCart.getProducts({
        where: { id: Number(productID) },
      });
      if (cartItems.length === 1) {
        await cartItems[0].CartItem.destroy();
      }

      return cartToJSON(await userCart.getProducts());
    },
    async getUserOrders({}, req) {
      const currentUser = await req.user;
      const orders = await currentUser.getOrders({ include: [Product, User] });
      return orders.map((order) => {
        return order.toJSON();
      });
    },
    async getOrders() {
      const orders = await Order.findAll({ include: [Product, User] });
      return orders.map((order) => {
        const user = order.User.toJSON();
        const items = order.Products.map((product) => {
          return {
            ...product.toJSON(),
            ...product.OrderItem.toJSON(),
          };
        });
        return {
          ...order.toJSON(),
          user,
          items,
        };
      });
    },
    async addOrder({ userID, input }, req) {
      const currentUser = req.user;
      let status = "created";
      if (userID && userID != currentUser.id) {
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
      await order.toJSON();
    },
    async updateOrder({ id, input }) {
      const order = await Order.findOne({ where: { id }, include: Product });
      if (order) {
        await order.update(input);
        await order.setProducts([]);
        for (const item of input.items) {
          await order.addProduct(item.id, {
            through: {
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
            },
          });
        }
        await order.toJSON();
      }
      sendError("Can't update this order", 403);
    },
    async removeOrder({ id }, req) {
      const numsOfDelete = await Order.destroy({ where: { id } });
      if (numsOfDelete > 0) {
        return true;
      }
      sendError("Can't delete this product", 403);
    },
    async getPaymentCode({ amount, currency = "usd" }, req) {
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
          resetTokenExpired: moment().add(2, "d"),
        });
      }
    },
    async verifyTokenAndResetPassword({ token, password }) {
      const user = await User.findOne({
        where: { resetToken: token, resetTokenExpired: { [Op.gte]: moment() } },
      });

      if (user) {
        const hash = await bcrypt.hash(password, 10);
        await user.update({
          resetTokenExpired: null,
          resetToken: null,
          password: hash,
        });
      } else {
        sendError("Token is invalid", 403);
      }
    },
  };
};
