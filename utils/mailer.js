const nodemailer = require("nodemailer");
const user = require("../schema/user");

const transporter = nodemailer.createTransport({
    host:"smtp.gmail.com",
    secure:true,
    auth: {
        user: "adoptly.pvt@gmail.com", // Replace with your email
        pass: "ksou xryw yzls wwoc"   // Replace with your app password (not your actual email password)
    },
    tls: {
        rejectUnauthorized:false
    }
});

async function sendOTP(email, otp) {
    const mailOptions = {
        from: "your-email@gmail.com",
        to: email,
        subject: "Adoptly OTP Verification",
        text: `Hello Dear ,

Welcome to Adoptly! We're thrilled to have you join our community.

To complete your registration, please use the One-Time Password (OTP) below:

🔑 Your OTP: ${otp}
⏳ This OTP is valid for 10 minutes.

If you did not request this OTP, please ignore this email. For security reasons, never share your OTP with anyone.

Need help? Feel free to contact our support team.

Happy adopting! 🐶🐱
The Adoptly Team

📧 Support: support@adoptly.com
🌍 Website: www.adoptly.com`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("OTP Sent Successfully");
    } catch (error) {
        console.error("Error sending OTP:", error);
    }
}

module.exports = sendOTP;
