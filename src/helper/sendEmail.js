const nodemailer = require('nodemailer');

module.exports.sendMail = async(email, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            host : process.env.EMAIL_HOST,
            port : 587,
            secure: false,
            auth : {
                user : process.env.USER_EMAIL,
                pass : process.env.USER_PASSWORD
            },
            tls: {
                rejectUnauthorized : false
            }
        });
        await transporter.sendMail({
            from : process.env.USER_EMAIL,
            to : email,
            subject : subject,
            text : text
        });
        console.log('Email send successfully');
    } catch (error) {
        console.log(error);
    }
}
