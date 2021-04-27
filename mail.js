const nodemailer = require("nodemailer");

const sendMail = async (dataMail) => {
    let transporter;

    const mailOptions = {
        from: process.env.MAIL_FROM,
        to: process.env.MAIL_CLIENT,
        subject: process.env.MAIL_SUBJECT,
        html: dataMail
    }

    transporter = nodemailer.createTransport({
        host: process.env.MAIL_SMTP,
        port: process.env.MAIL_PORT,
        secure: true,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });


    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId, process.env.MAIL_FROM);

}

module.exports = { sendMail }