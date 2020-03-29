const { checkSchema } = require('express-validator');

module.exports = checkSchema({
  author_id: {
    in: 'body',
    isString: true,
    trim: true,
    optional: true,
  },
  author_name: {
    in: 'body',
    isString: true,
    trim: true,
    optional: true,
  },
  is_html: {
    in: 'body',
    isBoolean: true,
    optional: true,
  },
  title: {
    in: 'body',
    isString: true,
    trim: true,
  },
  text: {
    in: 'body',
    isString: true,
  },
  time: {
    in: 'body',
    isISO8601: true,
    customSanitizer: {
      options: (value) => {
        return value ? new Date(value) : value;
      },
    },
    optional: {
      options: {
        nullable: true,
      }
    },
  },
  category: {
    in: 'body',
    isString: true,
    trim: true,
    optional: true,
  },
  original_url: {
    in: 'body',
    isURL: true,
    optional: true,
  },
  labels: {
    in: 'body',
    isArray: true,
    optional: true,
  },
  'labels.*': {
    in: 'body',
    isString: true,
    trim: true,
    notEmpty: true,
  },
  attachments: {
    in: 'body',
    isArray: true,
    optional: true,
  },
  'attachments.*.cid': {
    in: 'body',
    isString: true,
    trim: true,
    notEmpty: true,
  },
  'attachments.*.original_url': {
    in: 'body',
    isURL: true,
    optional: true,
  },
  'attachments.*.content_type': {
    in: 'body',
    isMimeType: true,
    optional: true,
  },
  version: {
    in: 'body',
    isInt: true,
    toInt: true,
    optional: true,
  },
});