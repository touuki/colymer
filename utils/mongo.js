const { MongoClient } = require('mongodb');
const config = require('../config').mongodb;

let _db;

module.exports = {
  init: (callback) => {
    MongoClient.connect(config.url, config.options, function (err, db) {
      if (err) return callback(err);
      _db = db.db(config.db);
      callback(null, _db);
    });
  },
  db: () => _db,
}