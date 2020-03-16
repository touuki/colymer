var MongoClient = require('mongodb').MongoClient;

var _db;
var _config;

module.exports = function (config) {
    if (_db) {
        return _db;
    } else if (_config) {
        throw new Error("MongoDB is not connected yet.");
    } else {
        _config = config;
        MongoClient.connect(config.url, config.options, function (err, db) {
            if (err) throw err;
            _db = db.db(config.db);
        });
    }
};
