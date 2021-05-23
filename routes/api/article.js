const express = require('express');
const router = express.Router();

const { query, matchedData } = require('express-validator');

const validator = require('../../validator');
const { db } = require('../../mongo');

function produceDownloadRequests(collection, article, callback) {
  if (!article.attachments) {
    return callback(null);
  }
  const downloadRequests = new Array();
  for (const attachment of article.attachments) {
    if (attachment.persist_info && !attachment.persist_info.saved) {
      downloadRequests.push({
        collection: collection,
        article_id: article._id,
        original_url: attachment.original_url,
        persist_info: attachment.persist_info,
      });
    }
  }
  if (downloadRequests.length == 0) {
    return callback(null);
  }
  db().collection('#attachment').insertMany(downloadRequests, { checkKeys: true, ignoreUndefined: true }, callback);
}

router.get('/:collection',
  validator.isAlphanumeric('param', 'collection'),
  validator.toJsonObjectOrArray('query', 'pipeline'),
  validator.toJsonObjectOrArray('query', 'collation').not().isArray().optional(),
  validator.checkResult, function (req, res, next) {
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

router.post('/:collection',
  validator.isAlphanumeric('param', 'collection'),
  validator.toBoolean('query', 'overwrite'),
  validator.article, validator.checkResult, function (req, res, next) {
    const body = matchedData(req, { locations: ['body'] });
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
    } else if (req.query.overwrite) {
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

router.get('/:collection/:_id',
  validator.isAlphanumeric('param', 'collection'),
  validator.toObjectId('param', '_id'),
  validator.toJsonObjectOrArray('query', 'projection').not().isArray(),
  validator.checkResult, function (req, res, next) {
    db().collection(req.params.collection).findOne({ _id: req.params._id },
      { projection: req.query.projection }, function (error, result) {
        if (error) return next(error);
        if (result)
          res.status(200).json(result);
        else
          res.status(404).send();
      });
  }
);

router.put('/:collection/:_id',
  validator.isAlphanumeric('param', 'collection'),
  validator.toObjectId('param', '_id'),
  validator.checkResult, function (req, res, next) {
    db().collection(req.params.collection).updateOne({ _id: req.params._id },
      req.body, { ignoreUndefined: true }, function (error, result) {
        if (error) return next(error);
        if (result.matchedCount) {
          res.status(204).send();
        } else {
          res.status(404).send();
        }
      });
  }
);

router.delete('/:collection/:_id',
  validator.isAlphanumeric('param', 'collection'),
  validator.toObjectId('param', '_id'),
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
