const config = require('../config');
module.exports = require('./' + (config.storage || 'default'));