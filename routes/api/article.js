const express = require('express');
const router = express.Router();

const { query, matchedData } = require('express-validator');
const $ = require('cheerio');

const validator = require('../../validator');
const { db } = require('../../mongo');

function produceDownloadRequests(collection, article, callback) {
  if (!article.attachments) {
    return callback(null);
  }
  const downloadRequests = new Array();
  for (const attachment of article.attachments) {
    if (!attachment.url && !attachment.path && attachment.original_url) {
      downloadRequests.push({
        attachment: attachment,
        article_id: article._id,
        referer: article.original_url,
        collection: collection,
      });
    }
  }
  if (downloadRequests.length == 0) {
    return callback(null);
  }
  db().collection('#attachment').insertMany(downloadRequests, { checkKeys: true, ignoreUndefined: true }, callback);
}

function resolveAttachments(article) {
  if (!article.content_type.startsWith('text/html')) {
    return article;
  }
  if (!article.attachments) {
    article.attachments = new Array();
  }
  const root = $(article.content);
  $('img,embed,object,video,audio,source', root).each((i, e) => {
    const element = $(e, root);
    const src = element.attr('data-src') || element.attr('src')
    if (src && !(src.startsWith('data:') || src.startsWith('cid:'))) {
      const id = Math.round(Math.random() * Math.pow(16, 10)).toString(16);
      article.attachments.push({
        id: id,
        original_url: src,
        content_type: element.attr('type'),
        metadata: {
          width: element.attr('width'),
          height: element.attr('height')
        }
      });
      element.attr('src', 'cid:' + id);
    }
  });
  article.content = $.html(root, { decodeEntities: false });
}

router.get('/:collection', validator.collection,
  query('pipeline').customSanitizer((value) => {
    try {
      return JSON.parse(value)
    } catch (error) {
      return value
    }
  }).custom((value) => typeof value === 'object'),
  query('collation').customSanitizer((value) => {
    try {
      return JSON.parse(value)
    } catch (error) {
      return value
    }
  }), validator.checkResult,
  function (req, res, next) {
    db().collection(req.params.collection).aggregate(req.query.pipeline, {
      maxTimeMS: 30000,
      collation: req.query.collation
    }, function (error, cursor) {
      if (error) return next(error);
      cursor.toArray(function (error, data) {
        if (error) return next(error);
        res.status(200).json(data);
      })
    })
  }
);

router.post('/:collection', validator.collection, query('replace').toBoolean(),
  query('resolve_attachments').toBoolean(), validator.article, validator.checkResult,
  function (req, res, next) {
    const body = matchedData(req, { locations: ['body'] });
    if (req.query.resolve_attachments) {
      resolveAttachments(body);
    }
    if (typeof body.id === 'undefined') {
      db().collection(req.params.collection).insertOne(body, {
        ignoreUndefined: true,
        checkKeys: true,
      }, function (error, result) {
        if (error) return next(error);
        body._id = result.insertedId;
        res.status(201).json({
          _id: result.insertedId
        });
        produceDownloadRequests(req.params.collection, body, (error) => error && console.error(error));
      });
    } else if (req.query.replace) {
      db().collection(req.params.collection).findOneAndReplace({
        id: body.id,
        version: typeof body.version === 'undefined' ? { $exists: false } : body.version,
      }, body, {
        projection: { _id: 1 },
        upsert: true,
        ignoreUndefined: true,
        checkKeys: true,
      }, function (error, result) {
        if (error) return next(error);
        if (result.lastErrorObject.updatedExisting) {
          body._id = result.value._id;
          res.status(200).json({
            _id: result.value._id
          });
        } else {
          body._id = result.lastErrorObject.upserted;
          res.status(201).json({
            _id: result.lastErrorObject.upserted
          });
        }
        produceDownloadRequests(req.params.collection, body, (error) => error && console.error(error));
      });
    } else {
      db().collection(req.params.collection).findOneAndUpdate({
        id: body.id,
        version: typeof body.version === 'undefined' ? { $exists: false } : body.version,
      }, { $setOnInsert: body }, {
        projection: { _id: 1 },
        upsert: true,
        ignoreUndefined: true,
        checkKeys: true,
      }, function (error, result) {
        if (error) return next(error);
        if (result.lastErrorObject.updatedExisting) {
          res.status(200).json({
            _id: result.value._id
          });
        } else {
          body._id = result.lastErrorObject.upserted;
          res.status(201).json({
            _id: result.lastErrorObject.upserted
          });
          produceDownloadRequests(req.params.collection, body, (error) => error && console.error(error));
        }
      });
    }
  }
);

router.get('/:collection/:_id', validator.collection, validator._id,
  validator.checkResult, function (req, res, next) {
    db().collection(req.params.collection).findOne({ _id: req.params._id }, function (error, result) {
      if (error) return next(error);
      if (result)
        res.status(200).json(result);
      else
        res.status(404).send();
    });
  }
);

router.put('/:collection/:_id', validator.collection, validator._id,
  validator.checkResult, function (req, res, next) {
    db().collection(req.params.collection).updateOne({ _id: req.params._id }, req.body, {
      ignoreUndefined: true
    }, function (error, result) {
      if (error) return next(error);
      if (result.matchedCount) {
        res.status(204).send();
      } else {
        res.status(404).send();
      }
    });
  }
);

router.delete('/:collection/:_id', validator.collection, validator._id,
  validator.checkResult, function (req, res, next) {
    db().collection(req.params.collection).deleteOne({
      _id: req.params._id
    }, function (error, result) {
      if (error) return next(error);
      if (result.deletedCount)
        res.status(204).send();
      else
        res.status(404).send();
    });
  }
);

module.exports = router;
