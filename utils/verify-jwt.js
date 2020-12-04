const { GraphQLError } = require("graphql");
const jwt = require("jsonwebtoken");
module.exports = function(req, res, next){
    if(req.headers['authorization']){
        const token = req.headers["authorization"].split(" ")[1];
        if(token){
            try{
                const authData = jwt.verify(token, "privatekey");
                req.authData = authData;
                
            }
            catch(e){
                console.log("JWT token is invalid");
            }
            finally{
                next();
            }
        }
    }
    else
        next();
}