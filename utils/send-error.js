module.exports = function sendError(message, status = 500){
    const error = new Error(message);
    error.code = status;
    throw error;
}