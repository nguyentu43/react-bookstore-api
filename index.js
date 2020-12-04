const express = require('express');
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
const bodyParser = require("body-parser");

app.use(cors());
app.use(compression());
app.use(helmet());
app.use(morgan("combined"));
app.use(bodyParser.json());

app.use(verifyJwt);

const storageRouter = require("./utils/file-storage")(sequelize);
app.use("/storages", storageRouter);

app.post("/graphql", graphqlHTTP({
    schema,
    rootValue: resolvers,
    customFormatErrorFn(err){
        if (!err.originalError) {
            return err;
        }
        const data = err.originalError.data;
        const message = err.message || 'An error occurred.';
        const code = err.originalError.code || 500;
        return { message: message, status: code, data: data };
    }
}));

app.listen(80, function(){
    console.log("Server run at 80");
});