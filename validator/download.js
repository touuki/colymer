const { checkSchema } = require('express-validator');
const path = require('path');
const { ObjectId } = require('mongodb');

module.exports.finish = checkSchema({
  _id: {
    in: 'body',
    customSanitizer: {
      options: (value) => {
        try {
          return new ObjectId(value);
        } catch (e) {
          return value;
        }
      },
    },
    custom: {
      options: (value) => value instanceof ObjectId
    }
  },
  collection: {
    in: 'body',
    notEmpty: true,
    matches: {
      options: /^[a-zA-Z0-9][a-zA-Z0-9\-_]*$/
    },
  },
  content_type: {
    in: 'body',
    isMimeType: true,
    optional: true,
  },
  original_url: {
    in: 'body',
    isURL: true,
  },
  filename: {
    in: 'body',
    notEmpty: true,
    isString: true,
    customSanitizer: {
      options: (value) => value && path.posix.basename(value),
    },
  },
  path: {
    in: 'body',
    notEmpty: true,
    isString: true,
    customSanitizer: {
      options: (value) => value && path.posix.normalize(value),
    },
    custom: {
      options: (value) => !value.startsWith('../')
    },
  },
});