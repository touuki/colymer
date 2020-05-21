const path = require('path');
const { param, query, validationResult } = require('express-validator');
const { ObjectId } =  require('mongodb');

module.exports = {
  article: require('./article'),
  collection: param('collection').notEmpty().matches(/^[a-zA-Z0-9][a-zA-Z0-9\-_]*$/),
  _id: param('_id').customSanitizer((value) => {
    try {
      return new ObjectId(value);
    } catch (error) {
      return value;
    }
  }),
  path: query('path').customSanitizer((value) => path.posix.normalize(value)).custom((value) => !value.startsWith('../')),
  checkResult: function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
}