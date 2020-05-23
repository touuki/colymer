const express = require('express');
const router = express.Router();

const { query } = require('express-validator');
const path = require('path');
const mime = require('mime-types');

const utils = require('../utils');
const downloaderUtils = require('../utils/downloader');
const validator = require('../validator');
const storage = require('../storage');
const { db } = require('../utils/mongo');

router.use(function (req, res, next) {
  if (req.get('Origin')) {
    res.header('Access-Control-Allow-Origin', req.get('Origin'));
    res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS,HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  }
  next();
});

router.post('/article/:collection', validator.collection, query('replace').toBoolean(),
  query('resolve_attachments').toBoolean(), validator.article, validator.checkResult,
  function (req, res, next) {
    if (req.query.resolve_attachments) {
      utils.resolveAttachments(req.body);
    }
    if (req.query.replace && typeof req.body.id !== 'undefined') {
      db().collection(req.params.collection).findOneAndReplace({
        id: req.body.id,
        version: typeof req.body.version === 'undefined' ? { $exists: false } : req.body.version,
      }, req.body, {
        upsert: true,
        ignoreUndefined: true,
        checkKeys: true,
      }, function (error, result) {
        if (error) return next(error);
        if (result.lastErrorObject.updatedExisting) {
          req.body._id = result.value._id;
          res.status(200).json({
            _id: result.value._id
          });
        } else {
          req.body._id = result.lastErrorObject.upserted;
          res.status(201).json({
            _id: result.lastErrorObject.upserted
          });
        }
        downloaderUtils.produceDownloadRequests(req.params.collection, req.body, (error) => error && console.error(error));
      });
    } else {
      db().collection(req.params.collection).insertOne(req.body, {
        ignoreUndefined: true,
        checkKeys: true,
      }, function (error, result) {
        if (error) return next(error);
        req.body._id = result.insertedId;
        res.status(201).json({
          _id: result.insertedId
        });
        downloaderUtils.produceDownloadRequests(req.params.collection, req.body, (error) => error && console.error(error));
      });
    }
  }
);

router.get('/article/:collection/:_id', validator.collection, validator._id,
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

router.put('/article/:collection/:_id', validator.collection, validator._id, query('resolve_attachments').toBoolean(),
  validator.article, validator.checkResult, function (req, res, next) {
    if (req.query.resolve_attachments) {
      utils.resolveAttachments(req.body);
    }
    db().collection(req.params.collection).replaceOne({ _id: req.params._id }, req.body, {
      ignoreUndefined: true,
      checkKeys: true,
    }, function (error, result) {
      if (error) return next(error);
      if (result.matchedCount) {
        req.body._id = req.params._id;
        res.status(204).send();
        downloaderUtils.produceDownloadRequests(req.params.collection, req.body, (error) => error && console.error(error));
      } else {
        res.status(404).send();
      }
    });
  }
);

router.delete('/article/:collection/:_id', validator.collection, validator._id,
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

router.get('/upload-info/attachment/:collection', validator.collection,
  query('isFormData').toBoolean(), validator.path,
  validator.checkResult, function (req, res, next) {
    res.status(200).json({
      upload: req.query.isFormData ? storage.getFormUploadInfo(req.params.collection, req.query.path)
        : storage.getDirectlyUploadInfo(req.params.collection, req.query.path),
      file: utils.attachmentInfo(req.params.collection, req.query.path)
    });
  });

router.get('/attachment/:collection', validator.collection, validator.checkResult,
  function (req, res, next) {
    res.redirect(storage.getUrl(req.params.collection, req.query.path));
  });

storage.installRouter(router);

module.exports = router;
