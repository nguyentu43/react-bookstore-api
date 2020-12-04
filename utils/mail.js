const sendGridMail = require("@sendgrid/mail");

sendGridMail.setApiKey("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");

module.exports = {
    async sendMail(to, subject, html){
        return await sendGridMail.send({
            from: "ngoctu4396@gmail.com",
            to,
            subject,
            html
        })
    }
}