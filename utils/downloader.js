const { db } = require('./mongo');
const config = require('../config').downloader;
const storage = require('../storage');
const path = require('path');
const fs = require('fs');
const request = require('request');
const contentDisposition = require('content-disposition');
const mime = require('mime-types');

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
      if (!attachment.url && !attachment.path && attachment.original_url) {
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

  saveAttachment: function (downloadRequest, callback) {
    const attachment = downloadRequest.attachment;

    const headers = {
      'user-agent': 'colymer',
    };
    if (config.options.headers) {
      for (const key in config.options.headers) {
        headers[key.toLowerCase()] = config.options.headers[key];
      }
    }
    if (downloadRequest.article.original_url) {
      const refererURL = new URL(downloadRequest.article.original_url);
      headers.origin = refererURL.origin;
      headers.referer = refererURL.href;
    }

    const options = Object.assign({}, config.options);
    options.headers = headers;
    options.url = attachment.original_url
    const req = request.get(options);

    req.on('error', function(error){
      downloadRequest.error = error;
      console.log(`[Warning ${new Date()}] Failed to download ${attachment.original_url}. Error: ${error.message}`);
      callback()
    });

    req.on('response', function (res) {
      if (res.statusCode == 200) {
        const url = new URL(attachment.original_url);

        if (typeof attachment.filename === 'undefined' && res.headers['content-disposition']) {
          try {
            const cd = contentDisposition.parse(res.headers['content-disposition']);
            if (cd.parameters.filename) {
              attachment.filename = path.posix.basename(cd.parameters.filename);
            }
          } catch (error) { }
        }

        if (typeof attachment.filename === 'undefined') {
          attachment.filename = path.posix.basename(url.pathname) || 'index';
        }

        if (typeof attachment.content_type === 'undefined') {
          if (res.headers['content-type']) {
            attachment.content_type = res.headers['content-type'].split(';')[0];
          } else {
            const contentType = mime.lookup(url.pathname) || mime.lookup(attachment.filename);
            if (contentType) {
              attachment.content_type = contentType;
            }
          }
        }

        let uploadPath;
        if (attachment.metadata && attachment.metadata.save_dir) {
          uploadPath = path.posix.join(attachment.metadata.save_dir, attachment.filename);
        } else {
          // adapt cgi-bin etc. the url.pathname may be same for different files.
          uploadPath = path.posix.join(url.hostname, path.posix.dirname(url.pathname), attachment.filename);
        }
        const uploadOptions = storage.getDirectlyUploadOptions(downloadRequest.collection, uploadPath);

        req.pipe(request(uploadOptions, function (error, response, body) {
          if (error) return callback(error);
          if (response.statusCode >= 200 && response.statusCode < 300) {
            attachment.path = uploadPath;
            callback();
          } else {
            callback(new Error(`HTTP Code: ${response.statusCode} ${response.statusMessage} Body: ${body}`));
          }
        }));
      } else {
        req.destroy(new Error(`HTTP Code: ${res.statusCode} ${res.statusMessage}`));
      }
    });

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
        'attachments.$[element].path': downloadRequest.attachment.path,
        'attachments.$[element].content_type': downloadRequest.attachment.content_type,
        'attachments.$[element].metadata.error': downloadRequest.error,
      },
      $unset: {
        'attachments.$[element].metadata.save_dir': ''
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
      active_time: { $lt: Date.now() - config.timeout * 1000 }
    }, function (error) {
      if (error) console.error(error);
      db().collection('#node').find({}, { projection: { _id: 1 } }).toArray(function (error, documents) {
        if (error) console.error(error);
        db().collection('#attachment').updateMany({
          accept: { $exists: true, $nin: documents.map(x => x._id) }
        }, {
          $unset: { accept: '' }
        }, function (error) {
          if (error) console.error(error);
        })
      })
    });
  },
}