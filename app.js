require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const methodOverride = require('method-override');
const session = require('express-session');
const passport = require('passport');
const passportLocal = require('passport-local');
const flash = require('connect-flash');
const path = require('path');
const ejsMate = require('ejs-mate');

const Adopt = require('./schema/adopt');
const User = require('./schema/user.js');
const { saveRedirectUrl, isLogIn } = require('./middleware.js');
const expressError = require('./utils/expressError');
const wrapAsync = require('./utils/wrapAsync');
const sendOTP = require("./utils/mailer");

// const {isLogIn} = require('./middleware.js')
const app = express();

const DBURL = process.env.ATLASDB_URL;

// MongoDB Connection
mongoose.connect(DBURL)
    .then(() => console.log('DB Connected...'))
    .catch(err => console.log(err));

// App Configuration
app.engine('ejs', ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Session Configuration
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 10 * 24 * 60 * 60 * 1000 // 10 days i
    }
}));



// Passport Authentication
app.use(passport.initialize());
app.use(passport.session());
passport.use(new passportLocal(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Flash Messages
app.use(flash());
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currUser = req.user || null;
    next();
});

// Routes

app.get('/', (req, res) => {
    res.redirect('/adoptly');
});


//user account:
app.get('/adoptly/user/:id', async(req,res) =>{
    let user= await User.findById(req.params.id);
    if (!user) {
        req.flash("error", "We Have To LogIn First! ");
        return res.redirect('/adoptly');
    }
    const userPosts = await Adopt.find({ owner: user._id });
    res.render("./page/user.ejs", { user , userPosts });
   
});


app.get("/adoptly/new", isLogIn, (req, res) => {
    res.render("./page/new.ejs");
});

app.get('/adoptly/:category', wrapAsync(async (req, res) => {
    let { category } = req.params;
    let Alladopts = await Adopt.find({ category });
    res.render('./page/catagory.ejs', { Alladopts });
}));

// EDIT ROUTE: Show Form to Edit Listing
app.get("/adoptly/:category/:id/edit",isLogIn, wrapAsync(async (req, res) => {
    const Alladopts = await Adopt.findById(req.params.id);
    if (!Alladopts) {
        req.flash("error", "animal Not Found!");
        return res.redirect("/adoptly");
    }
    res.render('./page/update.ejs', { Alladopts });
}));

// UPDATE ROUTE: Update  Database
app.put("/adoptly/:category/:id",isLogIn, wrapAsync(async (req, res) => {
    await Adopt.findByIdAndUpdate(req.params.id, { ...req.body.Alladopts });
    req.flash("success", "adopt details Updated Successfully!");
    res.redirect(`/adoptly/${req.params.category}/${req.params.id}`);
}));

// DELETE ROUTE: Remove  from Database
app.delete("/adoptly/:category/:id",isLogIn, wrapAsync(async (req, res) => {
    await Adopt.findByIdAndDelete(req.params.id);
    req.flash("success", "Adopt details is  Deleted Successfully!");
    res.redirect("/adoptly");
}));

app.post("/adoptly", isLogIn, wrapAsync(async (req, res) => {
    const newAdopt = new Adopt(req.body);
    newAdopt.owner = req.user._id;
    await newAdopt.save();
    req.flash("success", "Added new pet for adoption!");
    res.redirect("/adoptly");
}));

const _ = require('lodash');

app.get('/adoptly', wrapAsync(async (req, res) => {
    let allAdopts = await Adopt.find({});
    
    // Group by category and limit to 3 per category
    let limitedAdopts = _.chain(allAdopts)
        .groupBy('category')
        .map(adopts => adopts.slice(0, 3)) // Keep only 3 per category
        .flatten() // Convert grouped data back into a flat array
        .value();

    res.render('./page/landing', { limitedAdopts });
}));




//indivutal page
app.get('/adoptly/:category/:id', wrapAsync(async (req, res) => {
    let { id } = req.params;
    let adopt = await Adopt.findById(id).populate("owner");

    if (!adopt) {
        req.flash("error", "Pet Not Found!");
        return res.redirect("/adoptly");
    }
    res.render("./page/individual", { Alladopts: [adopt] });
}));

// OTP and User Registration
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}

app.post('/signup/send-otp', wrapAsync(async (req, res) => {
    const { username, password, email, fullName, address, state } = req.body;
    let existingUser = await User.findOne({ email });

    if (existingUser) {
        req.flash("error", "Email already registered!");
        return res.redirect("/signup");
    }

    let otp = generateOTP();
    req.session.otp = otp;
    req.session.signupData = { username, email, password, fullName, address, state };

    await sendOTP(email, otp);
    req.flash("success", "OTP sent to your email. Please verify.");
    res.redirect('/signup/verify');
}));

app.get('/signup/verify', (req, res) => {
    if (!req.session.signupData) {
        req.flash("error", "Session expired. Please sign up again.");
        return res.redirect('/signup');
    }
    res.render('./users/otpVerify.ejs');
});

app.post('/signup/verify', wrapAsync(async (req, res) => {
    const { otp } = req.body;
    if (req.session.otp && req.session.otp == otp) {
        let { username, email, password, fullName, address, state } = req.session.signupData;
        let newUser = new User({ username, email, fullName, address, state });

        const regUser = await User.register(newUser, password);
        req.login(regUser, (err) => {
            if (err) return next(err);
            req.flash("success", "User registered successfully!");
            res.redirect('/adoptly');
        });
    } else {
        req.flash("error", "Invalid OTP! Try again.");
        res.redirect('/signup/verify');
    }
}));

// User Authentication Routes
app.get('/signup', (req, res) => res.render('./users/signup.ejs'));
app.get('/login', (req, res) => res.render('./users/login.ejs'));

app.post('/login', saveRedirectUrl, passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
}), (req, res) => {
    req.flash('success', 'Welcome back!');
    let redirectUrl = res.locals.redirectUrl || '/adoptly';
    res.redirect(redirectUrl);
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return next(err);
        req.flash('success', "You have logged out.");
        res.redirect('/adoptly');
    });
});

const Razorpay = require('razorpay');
const crypto = require('crypto');

app.use(express.json());

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: 'rzp_test_uX0VeA2wZF0s8J',
    key_secret: 'w4AGJbhMOs23d34pRFPGTmnD'
});

// Create an order

app.post("/create-order", isLogIn,  async (req, res) => {

    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be logged in to place an order.');
        return res.redirect('/login');
    }
    try {
        const { amount, petId } = req.body;
        if (!amount) return res.status(400).json({ error: "Amount is required!" });

        const order = await razorpay.orders.create({
            amount: amount * 100,  // Convert INR to paisa
            currency: "INR",
            receipt: `order_rcptid_${petId}`
        });

        res.json(order);
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
});


// Verify payment
app.post("/verify-payment", async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, petId } = req.body;
        const secret = "w4AGJbhMOs23d34pRFPGTmnD";

        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest("hex");

        if (generatedSignature === razorpay_signature) {
            console.log("Payment Successful for Pet:", petId);
            return res.json({ success: true, redirectUrl: "/success" });
        } else {
            console.log("Payment Verification Failed!");
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ success: false, message: "Payment verification error" });
    }
});

app.get("/success", (req, res) => {
    res.render("./page/success"); 
});




//change password



app.post('/change-password', async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!req.user) {
        req.flash('error', 'You must be logged in to change your password.');
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/adoptly/user/' + req.user._id);
        }

        // Use passport-local-mongoose's built-in function
        user.changePassword(oldPassword, newPassword, async (err) => {
            if (err) {
                req.flash('error', 'Incorrect old password.');
                return res.redirect('/adoptly/user/' + req.user._id);
            }
            await user.save();
            req.flash('success', 'Password changed successfully!');
            res.redirect('/adoptly/user/' + req.user._id);
        });
    } catch (error) {
        console.error("Error changing password:", error);
        req.flash('error', 'Something went wrong.');
        res.redirect('/adoptly/user/' + req.user._id);
    }
});



//update user picture
require('dotenv').config();
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_pictures", // Store images in a specific Cloudinary folder
    format: async () => "png", // Convert all images to PNG
    public_id: (req, file) => `${req.user.username}_profile`, // Unique profile ID
  },
});
const upload = multer({ storage: storage });

app.post("/uploadProfile", upload.single("profileImage"), async (req, res) => {
    try {
      if (!req.user) {
        req.flash("error", "You must be logged in to upload a profile picture.");
        return res.redirect("/login");
      }
  
      // Update user's profile picture URL in the database
      await User.findByIdAndUpdate(req.user._id, { profileImage: req.file.path });
  
      req.flash("success", "Profile picture updated successfully!");
      res.redirect(`/adoptly/user/${req.user._id}`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Error uploading image.");
      res.redirect(`/adoptly/user/${req.user._id}`);
    }
  });


  //search pet
  app.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json([]);

        const searchResults = await Adopt.find({
            $or: [
                { category: new RegExp(query, 'i') },
                { breed: new RegExp(query, 'i') },
                { location: new RegExp(query, 'i') }
            ]
        }).limit(4); // Limit results for efficiency

        res.json(searchResults);
    } catch (error) {
        console.error('Search Error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

//cookies
// const session = require('express-session');
const bcrypt = require('bcryptjs');



const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    secure: true,
    auth: {
        user: "adoptly.pvt@gmail.com",  // Direct email
        pass: "ksou xryw yzls wwoc",   // Direct app password
    },
});

// Forgot Password Route
app.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            req.flash("error", "No account found with this email!");
            return res.redirect("/forgot-password");
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 5 * 60 * 1000; // Expiration time (5 minutes)

        console.log("Generated OTP:", otp, "Expires at:", otpExpires);

        // Store OTP in session instead of DB
        req.session.otp = otp;
        req.session.otpExpires = otpExpires;
        req.session.email = email; // Store email for verification

        // Send OTP via email
        const mailOptions = {
            from: `"Adoptly Support" <adoptly.pvt@gmail.com>`, // Ensure sender format
            to: email,
            subject: "Password Reset OTP",
            text: `Hello ${user.username},\n\nYour OTP for password reset is: ${otp}\n\nThis OTP will expire in 5 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        req.flash("success", "OTP sent to your email!");
        res.redirect("/verify-otp2");
    } catch (error) {
        console.error("Error in sending OTP:", error);
        req.flash("error", "Something went wrong! Try again later.");
        res.redirect("/forgot-password");
    }
});


//verify otp
// const bcrypt = require('bcrypt');
app.get('/forgot-password', (req, res) => {
    res.render('./users/forgotpassword.ejs'); // Ensure this EJS file exists
});
app.get('/verify-otp2', (req, res) => {
    res.render('./users/verify-otp2.ejs'); // Ensure this EJS file exists
});



app.post('/verify-otp2', async (req, res) => {
    try {
        const { otp, newPassword } = req.body;

        // Check if OTP matches the one in the session
        if (!req.session.otp || req.session.otp !== otp) {
            req.flash('error', 'Invalid OTP.');
            return res.redirect('/verify-otp2');
        }

        // Check if OTP has expired
        if (Date.now() > req.session.otpExpires) {
            req.flash('error', 'OTP has expired. Please request a new one.');
            return res.redirect('/forgot-password');
        }

        const user = await User.findOne({ email: req.session.email });

        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/forgot-password');
        }

        // Ensure the new password is provided
        if (!newPassword || newPassword.trim() === "") {
            req.flash('error', 'New password cannot be empty.');
            return res.redirect('/verify-otp2');
        }

        // Use Passport.js function to change password securely
        user.setPassword(newPassword, async (err) => {
            if (err) {
                req.flash('error', 'Error setting new password.');
                return res.redirect('/forgot-password');
            }

            // Save updated user
            await user.save();

            // Clear OTP from session
            req.session.otp = null;
            req.session.otpExpires = null;
            req.session.email = null;

            req.flash('success', 'Password updated successfully! You can now log in.');
            res.redirect('/login');
        });
    } catch (error) {
        console.error('Error in verifying OTP:', error);
        req.flash('error', 'Something went wrong! Try again later.');
        res.redirect('/forgot-password');
    }
});




// Error Handling
app.all('*', (req, res, next) => {
    next(new expressError(404, 'Page Not Found'));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = 'Something went wrong!' } = err;
    res.status(statusCode).render('error.ejs', { statusCode, message });
});

// Start Server
app.listen(process.env.PORT || 8080, () => {
    console.log(`Server started`);
});

