const sendError = require("./send-error");

module.exports = function(sequelize){

    const { User } = sequelize.models;

    const checkAuthAndGet = async function(req){
        if(req.authData){
            const currentUser = await User.findByPk(Number(req.authData.id));
            if(currentUser){
                return currentUser;
            }
            sendError("The user is not found", 404);
        }
        sendError("A token is invalid", 401);
    }

    const checkAdmin = async function(req){
        const currentUser = await checkAuthAndGet(req);
        if(!currentUser.isAdmin){
            sendError("Can't run this action", 403);
        }
    }

    return {
        checkAdmin,
        checkAuthAndGet
    }
}