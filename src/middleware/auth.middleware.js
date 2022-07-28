
const isAuthenticated = (req, res, next) => {
    if (req.user) {
        next();
    }
    else {
        res.status(401).json({
            msg: "Unauthorized. The user is not authenticated."
        });
    }
}

module.exports = {
    isAuthenticated
}