const crypto = require("crypto");

const { User } = require("../services/db");

const login = (req, res) => {
    if (req.user) {
        res.json({
            status: "OK",
            msg: "Success",
            username: req.user.username
        });
    }
    else {
        res.status(401).json({
            status: "Unauthorized",
            msg: "Incorrect username or password"
        });
    }
};

const logout = (req, res) => {
    req.logout((err) => {
        if (err) return next(err);

        res.json({
            status: "OK",
            msg: "Success"
        });
    });
};

const signup = async (req, res) => {
    const salt = crypto.randomBytes(16);
    crypto.pbkdf2(req.body.password, salt, 310000, 32, "sha256", (err, hashedPassword) => {
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
                status: "OK",
                msg: "Success",
                username: user.username
            });
        });
    });
};

const verifyAuthentication = (req, res) => {
    if (req.user) {
        res.json({
            status: "OK",
            msg: "Success",
            username: req.user.username
        });
    }
    else {
        res.json({
            status: "Unauthorized",
            msg: "Access denied"
        });
    }
}

module.exports = {
    login,
    logout,
    signup,
    verifyAuthentication
};