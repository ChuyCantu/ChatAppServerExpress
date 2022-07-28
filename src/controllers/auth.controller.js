const crypto = require("crypto");

const { User } = require("../services/db");

const login = (req, res) => {
    if (req.user) {
        res.json({
            ok: true,
            msg: "Successful Login",
            username: req.user.username
        });
    }
    else {
        res.status(401).json({
            ok: false,
            msg: "Incorrect username or password"
        });
    }
};

const logout = (req, res) => {
    req.logout((err) => {
        if (err) return next(err);

        res.json({
            ok: true,
            msg: "Successful Logout"
        });
    });
};

const signup = async (req, res) => {
    const username = req.body.username;
    const userMatch = await User.findOne({ with: { username } });

    if (userMatch) {
        return res.status(422).json({
                ok: false,
                msg: "The user already exist"
            });
    }

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
            // return next(err);
            return res.status(500).json({
                ok: false,
                msg: "Error"
            });
        }

        req.login(user, function(err) {
            if (err) return next(err);
            res.json({
                ok: true,
                msg: "Successful signup",
                username: user.username
            });
        });
    });
};

const verifyAuthentication = (req, res) => {
    if (req.user) {
        res.json({
            ok: true,
            msg: "User authenticated",
            username: req.user.username
        });
    }
    else {
        res.json({
            ok: false,
            msg: "Access denied"
        });
    }
}

const isUsernameValid = async (req, res) => {
    const username = req.params.username;
    const user = await User.findOne({ where: { username: username }});

    if (!user) {
        res.json({
            ok: true,
            msg: "Username valid"
        });
    }
    else {
        // res.status(409).json({
        res.json({
            ok: false,
            msg: "Username taken"
        });
    }
}

module.exports = {
    login,
    logout,
    signup,
    verifyAuthentication,
    isUsernameValid
};