const { checkSchema } = require('express-validator');

module.exports = checkSchema({
  top_id: {
    in: 'body',
    isNumeric: {
      options: {
        no_symbols: true
      }
    }
  },
  bottom_id: {
    in: 'body',
    isNumeric: {
      options: {
        no_symbols: true
      }
    }
  },
  bottom_cursor: {
    in: 'body',
    exists: true
  },
  has_next: {
    in: 'body',
    isBoolean: true,
  },
});