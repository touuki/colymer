const path = require('path');
const { param, query, validationResult } = require('express-validator');
const express_validator = require('express-validator');
const { ObjectId } = require('mongodb');

module.exports = {
  article: require('./article'),
  collection: param('collection').notEmpty().matches(/^[a-zA-Z0-9][a-zA-Z0-9\-_]*$/),
  toObjectId: (location, field) => express_validator[location](field).customSanitizer((value) => {
    try {
      return new ObjectId(value);
    } catch (e) {
      return value;
    }
  }).custom((value) => value instanceof ObjectId),
  toJsonObjectOrArray: (location, field) => express_validator[location](field).customSanitizer((value) => {
    try {
      return JSON.parse(value)
    } catch (error) {
      return value
    }
  }).custom((value) => typeof value === 'object'),
  toBoolean: (location, field) =>
    express_validator[location](field).customSanitizer(value => value ?
      value == 1 || value.toLowerCase() == 'true' : false),
  toBooleanOrUndefined: (location, field) =>
    express_validator[location](field).customSanitizer(value => value ?
      value == 1 || value.toLowerCase() == 'true' : undefined),
  path: query('path').customSanitizer((value) => value ? path.posix.normalize(value) : '').notEmpty()
    .custom((value) => !value.startsWith('../') && !/[\\:*?"<>|\f\n\r\t\v]/.test(value)),
  checkResult: function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
    } else {
      next();
    }
  },
}