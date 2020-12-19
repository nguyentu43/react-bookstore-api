require('dotenv').config();
const express = require("express");
const app = express();
const { graphqlHTTP } = require("express-graphql");
const morgan = require("morgan");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");

const sequelize = require("./db");
const resolvers = require("./graphql/resolvers")(sequelize);
const schema = require("./graphql/schema");
const verifyJwt = require("./utils/verify-jwt");
const { applyMiddleware } = require("graphql-middleware");
const permissions = require("./graphql/shield");
const { graphqlUploadExpress } = require("graphql-upload");

app.use(cors());
app.use(compression());
app.use(helmet({contentSecurityPolicy: false}));
app.use(morgan("combined"));

app.use(async function (req, res, next) {
  await verifyJwt(sequelize)(req, res, next);
});

app.use(express.static('public', { cacheControl: true }));

app.post(
  "/graphql",
  graphqlUploadExpress({ maxFileSize: 1024 * 1024 * 2, maxFiles: 5 }),
  graphqlHTTP({
    schema: applyMiddleware(schema, permissions),
    rootValue: resolvers,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || "An error occurred.";
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: data };
    },
  })
);

app.listen(process.env.PORT);
