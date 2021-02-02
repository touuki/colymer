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
  'attachments.*.persist_info': {
    in: 'body',
    isArray: {
      negated: true,
    },
    custom: {
      options: (value) => typeof value === 'object',
    },
    optional: true,
  },
  'attachments.*.persist_info.direct_transfer': {
    in: 'body',
    isBoolean: true,
    optional: true
  },
  'attachments.*.persist_info.follow_redirect': {
    in: 'body',
    isBoolean: true,
    optional: true
  },
  'attachments.*.persist_info.overwrite': {
    in: 'body',
    isBoolean: true,
    optional: true
  },
  'attachments.*.persist_info.saved': {
    in: 'body',
    isBoolean: true,
    optional: true
  },
  'attachments.*.persist_info.path': {
    in: 'body',
    customSanitizer: {
      options: (value) => value && path.posix.normalize(value),
    },
    notEmpty: true,
    custom: {
      options: (value) => !value.startsWith('../') && !/[\\:*?"<>|\f\n\r\t\v]/.test(value)
    },
    optional: true,
  },
  'attachments.*.persist_info.referer': {
    in: 'body',
    isURL: true,
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