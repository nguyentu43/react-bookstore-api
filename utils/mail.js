const sendGridMail = require("@sendgrid/mail");

sendGridMail.setApiKey(process.env.SENDGRID_API);

module.exports = {
  async sendMail(to, subject, html) {
    return await sendGridMail.send({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
    });
  },
};
