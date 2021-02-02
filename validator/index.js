const path = require('path');
const { param, query, validationResult } = require('express-validator');
const { ObjectId } = require('mongodb');

module.exports = {
  article: require('./article'),
  download: require('./download'),
  collection: param('collection').notEmpty().matches(/^[a-zA-Z0-9][a-zA-Z0-9\-_]*$/),
  _id: param('_id').customSanitizer((value) => {
    try {
      return new ObjectId(value);
    } catch (e) {
      return value;
    }
  }).custom((value) => value instanceof ObjectId),
  path: query('path').customSanitizer((value) => value && path.posix.normalize(value)).notEmpty()
    .custom((value) => !value.startsWith('../') && !/[\\:*?"<>|\f\n\r\t\v]/.test(value)),
  overwrite: query('overwrite').customSanitizer(value => value == 1 || value && value.toLowerCase() == 'true'),
  checkResult: function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
}