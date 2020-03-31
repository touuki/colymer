const { param, validationResult } = require('express-validator');

module.exports.content = require('./content');
module.exports.collection = param('collection').notEmpty().matches(/^[a-zA-Z0-9][a-zA-Z0-9\.-_]*$/);
module.exports.id = param('id').notEmpty().matches(/^[a-zA-Z0-9][a-zA-Z0-9\.-_]*$/);
module.exports.cid = param('cid').notEmpty().not().matches(/[\\/:*?"<>|\s]/);
module.exports.checkResult = function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
    } else {
        next();
    }
}