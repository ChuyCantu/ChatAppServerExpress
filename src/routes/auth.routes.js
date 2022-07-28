const { Router } = require("express");
const { check } = require('express-validator');
const passport = require("passport");
const LocalStrategy = require("passport-local");
const crypto = require("crypto");

const { isAuthenticated, validateFields } = require("../middleware/auth.middleware");
const { User } = require("../services/db");
const { login, logout, signup, verifyAuthentication, isUsernameValid } = require("../controllers/auth.controller");

passport.use(new LocalStrategy(async function verify(username, password, cb) {
    const user = await User.findOne({ where: { username: username }});
    if (!user) return cb(null, false, { message: "Incorrect username or password" });
        //return cb(new Error("Invalid username or password1"), false);

    crypto.pbkdf2(password, user.salt, 310000, 32, "sha256", function(err, hashedPassword) {
        if (err) return cb(err);
        if (!crypto.timingSafeEqual(user.hashed_password, hashedPassword))
            return cb(null, false, { message: "Incorrect username or password" });
        
        return cb(null, user);
    });
}));

// configure Passport to persist user information in the login session
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
        cb(null, { id: user.id, username: user.username });
    });
});
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, user);
    });
});

//+ Routes
const router = Router();

// Validate Token
router.get("/", [isAuthenticated], verifyAuthentication);

// Login
router.post("/", [
    check("username", "The username must be 3 or more alphanumeric characters (may include _)")
        .not().isEmpty().isLength({ min: 3 }).matches(/^[\w]*$/),
    check("password", "The password must be 6 to 16 characters")
        .not().isEmpty().isLength({ min: 6, max: 16 }),
    validateFields,
    passport.authenticate("local", { failureMessage: false })
], login);

// Logout
router.delete("/", logout);

// Signup
router.post("/new", [
    check("username", "The username must be 3 or more alphanumeric characters (may include _)")
        .not().isEmpty().isLength({ min: 3 }).matches(/^[\w]*$/),
    check("password", "The password must be 6 to 16 characters")
        .not().isEmpty().isLength({ min: 6, max: 16 }).matches(/^[-@.!\/#&+\w\s]*$/),
    validateFields,
], signup);

// Is username valid?
router.get("/verify/:username", isUsernameValid);

module.exports = router;
