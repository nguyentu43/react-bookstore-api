const mailjet = require ('node-mailjet')
    .connect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE)

module.exports = {
  async sendMail(to, subject, html) {
    return await mailjet
    .post("send", {'version': 'v3.1'})
    .request({
        "Messages":[{
            "From": {
                "Email": process.env.MAIL_FROM,
            },
            "To": [{
                "Email": to
            }],
            "Subject": subject,
            "HTMLPart": html
        }]
    });
  },
};
