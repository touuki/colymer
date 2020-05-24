const { checkSchema } = require('express-validator');
const path = require('path');

module.exports = checkSchema({
  id: {
    in: 'body',
    isString: true,
    optional: true,
  },
  'author.id': {
    in: 'body',
    isString: true,
    optional: true,
  },
  'author.name': {
    in: 'body',
    isString: true,
    optional: true,
  },
  content_type: {
    in: 'body',
    isMimeType: true,
  },
  title: {
    in: 'body',
    isString: true,
    optional: true,
  },
  content: {
    in: 'body',
    isString: true,
  },
  time: {
    in: 'body',
    isISO8601: true,
    customSanitizer: {
      options: (value) => new Date(value),
    },
    optional: true,
  },
  metadata: {
    in: 'body',
    isArray: {
      negated: true,
    },
    custom: {
      options: (value) => typeof value === 'object',
    },
    optional: true,
  },
  original_url: {
    in: 'body',
    isURL: true,
    optional: true,
  },
  attachments: {
    in: 'body',
    isArray: true,
    optional: true,
  },
  'attachments.*.id': {
    in: 'body',
    isString: true,
    optional: true,
  },
  'attachments.*.filename': {
    in: 'body',
    isString: true,
    customSanitizer: {
      options: (value) => value && path.posix.basename(value),
    },
    optional: true,
  },
  'attachments.*.url': {
    in: 'body',
    isURL: true,
    optional: true,
  },
  'attachments.*.content_type': {
    in: 'body',
    isMimeType: true,
    optional: true,
  },
  'attachments.*.original_url': {
    in: 'body',
    isURL: true,
    optional: true,
  },
  'attachments.*.path': {
    in: 'body',
    notEmpty: true,
    customSanitizer: {
      options: (value) => value && path.posix.normalize(value),
    },
    custom: {
      options: (value) => !value.startsWith('../')
    },
    optional: true,
  },
  'attachments.*.metadata': {
    in: 'body',
    isArray: {
      negated: true,
    },
    custom: {
      options: (value) => typeof value === 'object',
    },
    optional: true,
  },
  'attachments.*.metadata.save_dir': {
    in: 'body',
    notEmpty: true,
    customSanitizer: {
      options: (value) => value && path.posix.normalize(value),
    },
    custom: {
      options: (value) => !value.startsWith('../')
    },
    optional: true,
  },
  version: {
    in: 'body',
    custom: {
      options: (value) => typeof value !== 'object',
    },
    optional: true,
  },
});