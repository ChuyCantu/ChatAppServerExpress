const { Router } = require("express");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const crypto = require("crypto");

const { isAuthenticated } = require("../middleware/auth.middleware");
const { User } = require("../services/db");
const { login, logout, signup, verifyAuthentication } = require("../controllers/auth.controller");

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

router.get("/verify", [isAuthenticated], verifyAuthentication);
router.post("/login", passport.authenticate("local", { failureMessage: false }), login);
router.delete("/logout", logout);
router.post("/signup", signup);

module.exports = router;
