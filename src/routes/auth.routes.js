const { Router } = require("express");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const crypto = require("crypto");
const { isAuthenticated } = require("../middleware/auth.middleware")
const { User } = require("../services/db");

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

const router = Router();

router.get("/test", [isAuthenticated], (req, res) => {
    if (req.user) {
        res.json({
            msg: "User authenticated",
            username: req.user.username
        });
    }
    else {
        res.json({
            msg: "Access denied"
        });
    }
});

router.post("/login", 
    passport.authenticate("local", { failureMessage: false }), (req, res) => {
        if (req.user) {
            res.json({
                msg: "Log in",
                username: req.user.username
            });
        }
        else {
            res.status(401).json({
                msg: "Incorrect username or password"
            });
        }
    }
);

router.delete("/logout", function(req, res, next) {
    req.logout(function(err) {
        if (err) return next(err);

        res.json({
            msg: "Log out successful"
        });
    });
});

router.post("/signup", async function(req, res, next) {
    const salt = crypto.randomBytes(16);
    crypto.pbkdf2(req.body.password, salt, 310000, 32, "sha256", function(err, hashedPassword) {
        if (err) return next(err);

        const user = User.build({ 
            username: req.body.username,
            hashed_password: hashedPassword,
            salt
        });
        try {
            user.save();
        }
        catch(err) {
            return next(err);
        }

        req.login(user, function(err) {
            if (err) return next(err);
            res.json({
                msg: "Sing up and log in successful",
                username: user.username
            });
        });
    });
});

module.exports = router;