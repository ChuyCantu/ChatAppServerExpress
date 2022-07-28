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

const validateFields = (req, res = response, next) => {
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
            errors: errorsNoValues
        });
    }

    next(); // Everything went well, continue
}

module.exports = {
    isAuthenticated,
    validateFields
}