var fs = require('fs');
var path = require('path');
var mime = require('mime-types');
var express = require('express');
var router = express.Router();

var config = require('../config');
var mongodb = require('../utils/mongo');

var vaildate = function (obj, fn) {
  for (const key in obj) {
    if (!fn(obj[key])) {
      throw new Error("Invaild " + key + ": " + obj[key] + ".");
    }
  }
}

var vaildateArray = function (obj, fn) {
  for (const key in obj) {
    const arr = obj[key];
    for (let i = 0; i < arr.length; i++) {
      if (!fn(arr[i])) {
        throw new Error("Invaild " + key + "[" + i + "]: " + arr[i] + ".");
      }
    }
  }
}

var constructAttachment = function (attachment) {
  var filename = attachment.filename;
  var encoding = attachment.encoding;
  var content = attachment.content;
  vaildate({ filename, encoding, content }, (v) => typeof v === 'string');
  var extname = path.extname(filename);
  return {
    content_type: mime.lookup(extname) || 'application/octet-stream',
    extension: extname,
    filename: path.basename(filename),
    content: Buffer.from(content, encoding),
    encoding: encoding
  }
}

var vaildateMetadata = function (metadata) {
  vaildate({ metadata }, (v) => typeof v === 'object');
  vaildate({
    metadata_category: metadata.category,
    metadata_original_url: metadata.original_url
  }, (v) => typeof v === 'string' || typeof v === 'undefined');
  if (typeof metadata.labels !== 'undefined') {
    vaildate({ metadata_labels: metadata.labels }, (v) => v instanceof Array);
    vaildateArray({
      metadata_labels: metadata.labels
    }, (v) => typeof v === 'string');
  }
}

var constructDocument = function (id, obj) {
  var html = obj.html ? true : false;
  var time = new Date(obj.time).getTime();
  var author_name = obj.author_name;
  var author_id = obj.author_id;
  var title = obj.title;
  var text = obj.text;
  var metadata = obj.metadata;
  var attachments = obj.attachments;

  vaildate({ time }, (v) => isFinite(v));
  vaildate({
    id,
    author_name,
    author_id,
    title,
    text,
  }, (v) => typeof v === 'string');
  vaildateMetadata(metadata);
  vaildate({ attachments }, (v) => v instanceof Array);

  for (let i = 0; i < attachments.length; i++) {
    attachments[i] = constructAttachment(attachments[i]);
  }

  return {
    id, html, time, author_name, author_id, title, text, metadata, attachments
  };
};


var saveAttachments = function (bucket, doc, callback) {
  var dirname = path.join(config.attachment.dirname, bucket, doc.id);

  function saveAttachment(doc, i, callback) {
    if (i < doc.attachments.length) {
      var attachment = doc.attachments[i];
      fs.writeFile(
        path.join(dirname, attachment.filename),
        attachment.content,
        function (err) {
          if (err) {
            callback(err, i);
          } else {
            delete attachment.content;
            saveAttachment(doc, ++i, callback);
          }
        });
    } else {
      callback(null, ++i);
    }
  };

  fs.mkdir(dirname, { recursive: true }, (err) => {
    if (err && err.code !== 'EEXIST') callback(err, 0);
    saveAttachment(doc, 0, callback);
  });

}

router.put('/document/:bucket/:id', function (req, res, next) {
  var doc = constructDocument(req.params.id, req.body);
  saveAttachments(req.params.bucket, doc, function (error, result) {
    if (error) next(error);
    mongodb().collection(req.params.bucket).insertOne(doc, function (error, result) {
      if (error) next(error);
      res.status(204).send();
    });
  });
});

module.exports = router;
