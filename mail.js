const nodemailer = require("nodemailer");

const sendMail = async (dataMail) => {
    const transporter = nodemailer.createTransport({
        host: process.env.MAIL_SMTP,
        port: process.env.MAIL_PORT,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });

    let info = await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: process.env.MAIL_CLIENT,
        subject: process.env.MAIL_SUBJECT,
        text: dataMail
    });
    console.log("Message sent: %s", info.messageId);
}

module.exports = { sendMail }