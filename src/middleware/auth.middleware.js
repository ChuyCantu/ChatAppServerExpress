const { validationResult } = require('express-validator')

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

const validateFields = (req, res, next) => {
    const errors = validationResult(req);

    // Don't send values back
    const errorsMap = errors.mapped();
    let errorsNoValues = { };
    for (let key in errorsMap) {
        const error = errorsMap[key];
        const { value, ...rest } = error;
        errorsNoValues[key] = rest;
    }

    if (!errors.isEmpty()) {
        return res.status(400).json({
            ok: true,
            msg: "Invalid fields",
            errors: errorsNoValues
        });
    }

    next(); // Everything went well, continue
}

const validateConfirmPassword = (req, res, next) => {
    const password = req.body.password;
    const confirm_password = req.body.confirm_password;

    console.log(req.body)

    if (password === confirm_password) {
        next();
    }
    else {
        return res.status(400).json({
            ok: true,
            msg: "Invalid fields",
        });
    }
}

module.exports = {
    isAuthenticated,
    validateFields,
    validateConfirmPassword
}