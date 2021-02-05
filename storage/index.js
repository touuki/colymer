const config = require('../config');
const DefaultStorage = require('./default');
module.exports = new DefaultStorage(config.default_storage_options);