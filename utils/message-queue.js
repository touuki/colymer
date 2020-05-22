const { db } = require('./mongo');
const config = require('../config').downloader;
const path = require('path');

module.exports = {
  registerNode: function (callback) {
    db().collection('#node').insertOne({ active_time: Date.now() }, function (error, result) {
      if (error) return callback(error);
      callback(null, result.insertedId);
    });
  },

  deregisterNode: function (nodeId, callback) {
    db().collection('#node').deleteOne({ _id: nodeId }, callback);
  },

  nodeKeepAlive: function (nodeId, callback) {
    db().collection('#node').updateOne({ _id: nodeId }, { $set: { active_time: Date.now() } },
      { upsert: true }, callback);
  },

  produceDownloadRequests: function (collection, article, callback) {
    if (!article.attachments) {
      return callback(null);
    }
    const downloadRequests = new Array();
    for (const attachment of article.attachments) {
      if (!attachment.url && attachment.original_url) {
        downloadRequests.push({
          attachment: attachment,
          article: {
            _id: article._id,
            original_url: article.original_url
          },
          collection: collection,
        });
      }
    }
    if (downloadRequests.length == 0) {
      return callback(null);
    }
    db().collection('#attachment').insertMany(downloadRequests, { checkKeys: true }, callback);
  },

  acceptDownloadRequest: function (nodeId, callback) {
    db().collection('#attachment').findOneAndUpdate({ accept: { $exists: false } }, { $set: { accept: nodeId } },
      function (error, result) {
        if (error) return callback(error);
        callback(null, result.value);
      });
  },

  finishDownloadRequest: function (downloadRequest, callback) {
    db().collection(downloadRequest.collection).updateOne({ _id: downloadRequest.article._id }, {
      $set: {
        'attachments.$[element].filename': downloadRequest.attachment.filename,
        'attachments.$[element].url': downloadRequest.attachment.url,
        'attachments.$[element].path': downloadRequest.attachment.path,
        'attachments.$[element].content_type': downloadRequest.attachment.content_type,
      }
    }, {
      arrayFilters: [{
        'element.original_url': downloadRequest.attachment.original_url
      }],
      ignoreUndefined: true,
    }, function (error) {
      if (error) return callback(error);
      db().collection('#attachment').deleteOne({ _id: downloadRequest._id }, callback);
    });
  },

  clearZombieRequestAndNode: function () {
    db().collection('#node').deleteMany({
      active_time: { $le: Date.now() - config.timeout * 1000 }
    }, function (error) {
      if (error) console.error(error);
      db().collection('#node').find({}, { projection: { _id: 1 } }).toArray(function (error, documents) {
        if (error) console.error(error);
        db().collection('#attachment').updateMany({
          accept: { $exists: true, $nin: documents.map(x => x._id) }
        }, {
          $unset: { accept: "" }
        }, function (error) {
          if (error) console.error(error);
        })
      })
    });
  },
}