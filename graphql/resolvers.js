const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { QueryTypes, Op } = require("sequelize");
const sendError = require("../utils/send-error");
const stripe = require("stripe")(process.env.STRIPE_SK);
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
});
const { sendMail } = require("../utils/mail");
const cryptoRandomString = require("crypto-random-string");
const moment = require("moment");
const { isArray } = require("lodash");
const { GraphQLUpload } = require("graphql-upload");

module.exports = function (sequelize) {
  const { User, Product, Order, Category, Author, Rating } = sequelize.models;

  function cartToJSON(items) {
    return items.map((item) => ({
      ...item.toJSON(),
      images: item.images.map((public_id) => ({
        secure_url: cloudinary.url(public_id, {
          secure: true,
          quality: "auto:good",
        }),
        public_id,
      })),
      quantity: item.CartItem.quantity,
    }));
  }

  function productToJSON(product) {
    return {
      ...product.toJSON(),
      category: product.Category.toJSON(),
      images: product.images.map((image) => ({
        public_id: image,
        secure_url: cloudinary.url(image, {
          secure: true,
          quality: "auto:good",
        }),
      })),
      authors: product.Authors.map((a) => a.toJSON()),
      ratings: product.Ratings.map(async (r) => await ratingToJSON(r)),
    };
  }

  async function ratingToJSON(rating) {
    return { ...rating.toJSON(), user: await rating.getUser() };
  }

  function orderToJSON(order) {
    return {
      ...order.toJSON(),
      user: order.User ? order.User.toJSON() : null,
      items: order.Products.map(
        ({
          id,
          name,
          slug,
          images,
          OrderItem: { price, quantity, discount },
        }) => ({
          id,
          name,
          slug,
          price,
          quantity,
          discount,
          images: images.map((public_id) => ({
            public_id,
            secure_url: cloudinary.url(public_id, {
              secure: true,
              quality: "auto:good",
            }),
          })),
        })
      ),
    };
  }

  return {
    Upload: GraphQLUpload,
    async getImages({ cursor: next_cursor }) {
      const max_results = 5;
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
        sendError(error.code, 400);
      }
    },
    async uploadImages({ files: uploadFiles, urls }) {
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

      for (const url of urls.split("\n")) {
        if (url.trim() != "") {
          uploadPromises.push(
            cloudinary.uploader.upload(url, { folder: "store" })
          );
        }
      }

      try {
        const results = await Promise.all(uploadPromises);
        return results.map(({ public_id, secure_url }) => ({
          public_id,
          secure_url,
        }));
      } catch (error) {
        sendError("Upload Error", 400);
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
        sendError("Delete Error", 400);
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
      sendError("A email/password is invalid", 400);
    },
    async register({ input }) {
      if (
        !(
          input.password &&
          input.password.length <= 25 &&
          input.password.length >= 5
        )
      ) {
        sendError("Validator Error", 400);
      }

      const hash = await bcrypt.hash(input.password, 10);
      input.password = hash;

      if (await User.findOne({ where: { email: input.email } })) {
        sendError("A email is already registered", 400);
        return;
      }

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
    async getCategories() {
      const categories = await Category.findAll({
        include: [{ all: true, nested: true }],
        order: [["createdAt", "desc"]],
      });
      return categories.map((category) => category.toJSON());
    },
    async addCategory({ input }) {
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
      const authors = await Author.findAll({ order: [["createdAt", "desc"]] });
      return authors.map(async (author) => ({
        ...author.toJSON(),
        avatar: cloudinary.url(author.avatar, {
          secure: true,
          quality: "auto:eco",
        }),
        books: await author.countProducts(),
      }));
    },
    async addAuthor({ input }) {
      const author = await Author.create({ ...input });
      return author.toJSON();
    },
    async updateAuthor({ id, input }) {
      const result = await Author.update({ ...input }, { where: { id } });
      if (result) {
        return (await Author.findByPk(id)).toJSON();
      } else {
        sendError("A author is not found", 404);
      }
    },
    async removeAuthor({ id }) {
      const result = await Author.destroy({ where: { id } });
      if (result) {
        return true;
      } else {
        sendError("A author is not found", 404);
      }
    },
    async getProduct({ slug }) {
      const p = await Product.findOne({
        where: { slug },
        include: { all: true, nested: true },
        order: [[Rating, "createdAt", "DESC"]],
      });
      if (p) {
        return productToJSON(p);
      } else {
        sendError("A product is not found", 404);
      }
    },
    async getProducts({ search = "", offset, limit }) {
      const params = search.split("&");
      let searchParam = "";
      const bindParams = [];
      let orderSQL = 'order by "Products"."createdAt" desc';
      let whereSQL = " 1=1 ";

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
              case 4:
                orderSQL = 'order by "Products".discount desc';
                break;
            }
            break;
          case "keyword":
            if (sp[1] === "") break;
            searchParam = sp[1].split(" ").join(" & ");
            whereSQL += ' and to_tsvector("Products".name) @@ to_tsquery(?)';
            break;
          case "category":
            whereSQL +=
              ' and ("Products"."CategoryId" = ? or "Categories"."parentID" = ?)';
            bindParams.splice(0, 0, sp[1], sp[1]);
            break;
          case "author":
            whereSQL += ' and "AuthorProduct"."AuthorId" = ?';
            bindParams.push(sp[1]);
            break;
          case "range":
            const range = sp[1].split("-");
            whereSQL +=
              ' and ("Products".price between ? and ? or "Products".price * (1 - "Products".discount) between ? and ?)';
            bindParams.push(range[0]);
            bindParams.push(range[1]);
            bindParams.push(range[0]);
            bindParams.push(range[1]);
            break;
          default:
            break;
        }
      }

      let sql = `select distinct "Products".* ${
        orderSQL.includes("group by")
          ? ', coalesce(sum("OrderItems".quantity), 0)'
          : ""
      } from "Products" left join "Categories" on "Categories"."id" = "Products"."CategoryId"  join "AuthorProduct" on "AuthorProduct"."ProductId" = "Products".id left join "OrderItems" on "Products".id = "OrderItems"."ProductId" where ${whereSQL} ${orderSQL}`;

      if (offset) {
        sql += " offset ?";
        bindParams.push(offset);
      }

      if (limit) {
        sql += " limit ?";
        bindParams.push(limit);
      }

      const replacements = [...bindParams];
      if (searchParam !== "") {
        replacements.unshift(searchParam);
      }

      const ps = await sequelize.query(sql, {
        model: Product,
        mapToModel: true,
        type: QueryTypes.SELECT,
        replacements,
      });

      return ps.map(async (p) => {
        await p.reload({ include: [{ all: true, nested: true }] });
        return productToJSON(p);
      });
    },
    async addProduct({ input }) {
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
    async removeProduct({ id }) {
      const numsOfDelete = await Product.destroy({ where: { id } });
      if (numsOfDelete > 0) {
        return true;
      }
      sendError("Can't delete this product", 403);
    },
    async getUsers() {
      const users = await User.findAll({ order: [["createdAt", "desc"]] });
      return users.map((user) => user.toJSON());
    },
    async addUser({ input }) {
      if (input.password) {
        const hash = await bcrypt.hash(input.password, 10);
        input.password = hash;
      }

      const user = await User.create(input);
      user.createCart();
      return user.toJSON();
    },
    async updateUser({ id, input }) {
      if (input.password) {
        const hash = await bcrypt.hash(input.password, 10);
        input.password = hash;
      }
      const result = await User.update(input, { where: { id } });
      if (result > 0) {
        const user = await User.findByPk(id);
        return user.toJSON();
      }
      sendError("A user is not found", 404);
    },
    async removeUser({ id }) {
      const result = await User.destroy({ where: { id } });
      if (result > 0) {
        return true;
      }
      sendError("A user is not found", 404);
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
      return (
        await currentUser.getProducts({
          include: [{ all: true, nested: true }],
        })
      ).map((p) => productToJSON(p));
    },
    async addWishlist({ id }, req) {
      if (await req.user.hasProduct(Number(id))) {
        return true;
      }
      return !!(await req.user.addProduct(id));
    },
    async removeWishlist({ id }, req) {
      return !!(await req.user.removeProduct(id));
    },
    async addCartItem({ input: { id, quantity } }, req) {
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
        return orderToJSON(order);
      });
    },
    async getOrders() {
      const orders = await Order.findAll({
        include: [Product, User],
        order: [["createdAt", "desc"]],
      });
      return orders.map((order) => orderToJSON(order));
    },
    async checkout({ input }, req) {
      const userID = req.user.id;
      userCart = await req.user.getCart();
      await userCart.setProducts([]);
      input.status = "charged";
      return this.addOrder({ userID, input });
    },
    async addOrder({ userID, input }) {
      const order = await Order.create(input);
      if (userID) await order.setUser(Number(userID));
      for (const item of input.items) {
        await order.addProduct(item.id, {
          through: {
            quantity: item.quantity,
            price: item.price,
            discount: item.discount,
          },
        });
      }
      return orderToJSON(
        await order.reload({ include: [{ all: true, nested: true }] })
      );
    },
    async updateOrder({ id, input, userID }) {
      const order = await Order.findByPk(id, { include: Product });
      if (order) {
        await order.update(input);
        await order.setUser(userID);
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
        return orderToJSON(
          await order.reload({ include: [{ all: true, nested: true }] })
        );
      }
      sendError("Can't update this order", 403);
    },
    async removeOrder({ id }) {
      const numsOfDelete = await Order.destroy({ where: { id } });
      if (numsOfDelete > 0) {
        return true;
      }
      sendError("Can't delete this product", 403);
    },
    async addRating({ input, productID, userID }) {
      const rating = await Rating.create({ ...input });
      await rating.setUser(userID);
      await rating.setProduct(productID);
      return ratingToJSON(rating);
    },
    async updateRating({ input, id }) {
      const rating = await Rating.findByPk(id);
      if (rating) {
        await rating.update(input);
      } else {
        sendError("Can't update this order", 403);
      }
      return ratingToJSON(rating);
    },
    async removeRating({ id }) {
      const numsOfDelete = await Rating.destroy({ where: { id } });
      if (numsOfDelete > 0) {
        return true;
      }
      sendError("Can't delete this rating", 403);
    },
    async getPaymentCode({ total: amount, currency = "usd" }, req) {
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
      const host = process.env.FRONTEND_URL;
      const link = host + "/forgot-password?token=" + randomString;
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
    async getDashboardData({ year = moment().year() }) {
      const data = {
        productCount: await Product.count(),
        orderCount: await Order.count(),
        userCount: await Order.count(),
        yearlyChart: [["Year", "Sales"]],
        monthlyChart: [["Month", "Sales"]],
        bestSellerChart: [["Name", "Sales"]],
      };

      const [yearlyResult] = await sequelize.query(`
        SELECT extract(year from "createdAt") as year, sum("total")
        FROM "Orders"
        WHERE "Orders".status = 'charged'
        group by extract(year from "createdAt")
      `);
      for (const { year, sum } of yearlyResult) {
        data.yearlyChart.push([year.toString(), sum]);
      }

      const [monthlyResult] = await sequelize.query(
        `
        SELECT extract(month from "createdAt") as month, sum("total")
        FROM "Orders"
        WHERE "Orders".status = 'charged' and extract(year from "createdAt") = ?
        group by extract(month from "createdAt")
      `,
        { replacements: [year] }
      );
      for (const { month, sum } of monthlyResult) {
        data.monthlyChart.push([month.toString(), sum]);
      }

      const salesYear = data.yearlyChart.find(
        (item) => item[0] === year.toString()
      );
      if (salesYear) {
        const [bestSellerResult] = await sequelize.query(
          `
        SELECT "Products".id, "Products".name, sum("OrderItems"."quantity" * "OrderItems"."price" * (1 - "OrderItems"."discount"))
        FROM "Orders" join "OrderItems" on "Orders".id = "OrderItems"."OrderId" 
            join "Products" on "Products".id = "OrderItems"."ProductId"
        WHERE "Orders".status = 'charged' and extract(year from "Orders"."createdAt") = ?
        GROUP BY "Products".id, "Products".name
        order by sum("OrderItems"."quantity" * "OrderItems"."price" * (1 - "OrderItems"."discount")) desc
        limit 10
        `,
          { replacements: [year] }
        );

        let remaining = salesYear[1];
        for (const { name, sum } of bestSellerResult) {
          remaining -= sum;
          data.bestSellerChart.push([name, sum]);
        }

        data.bestSellerChart.push(["Remaining", remaining]);
      }

      return JSON.stringify(data);
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
        sendError("Token is invalid", 400);
      }
    },
  };
};
