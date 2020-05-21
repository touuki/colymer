const express = require('express');
const router = express.Router();

const { query } = require('express-validator');
const path = require('path');
const mime = require('mime-types');

const validator = require('../validator');
const storage = require('../storage');
const mongodb = require('../utils/mongo');

router.use(function (req, res, next) {
  if (req.get('Origin')) {
    res.header('Access-Control-Allow-Origin', req.get('Origin'));
    res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS,HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  }
  next();
});

router.all('/article/:collection/*', validator.collection);

router.post('/article/:collection', query('replace').toBoolean(),
  validator.article, validator.checkResult, function (req, res, next) {
    if (req.query.replace && typeof req.body.id !== 'undefined') {
      mongodb().collection(req.params.collection).replaceOne({
        id: req.body.id,
        version: typeof req.body.version === 'undefined' ? { $exists: false } : req.body.version,
      }, req.body, {
        upsert: true,
        ignoreUndefined: true,
      }, function (error, result) {
        if (error) return next(error);
        if (result.matchedCount) {
          res.status(204).send();
        } else {
          res.status(201).json({
            _id: result.upsertedId._id
          });
        }
      });
    } else {
      mongodb().collection(req.params.collection).insertOne(req.body, {
        ignoreUndefined: true,
      }, function (error, result) {
        if (error) return next(error);
        res.status(201).json({
          _id: result.insertedId
        });
      });
    }
  }
);

router.all('/article/:collection/:_id/*', validator._id);

router.get('/article/:collection/:_id',
  validator.checkResult, function (req, res, next) {
    mongodb().collection(req.params.collection).findOne({
      _id: req.params._id
    }, function (error, result) {
      if (error) return next(error);
      if (result)
        res.status(200).json(result);
      else
        res.status(404).send();
    });
  }
);

router.put('/article/:collection/:_id',
  validator.article, validator.checkResult, function (req, res, next) {
    mongodb().collection(req.params.collection).updateOne({
      _id: req.params._id
    }, { $set: req.body }, {
      checkKeys: true,
      ignoreUndefined: true,
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

router.delete('/article/:collection/:_id',
  validator.checkResult, function (req, res, next) {
    mongodb().collection(req.params.collection).deleteOne({
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

router.get('/upload-info/attachment/:collection', query('isFormData').toBoolean(), validator.path,
  validator.checkResult, function (req, res, next) {
    res.status(200).json({
      upload: storage.getUploadMethod(req.params.collection,
      req.query.path, req.query.isFormData),
      file: {
        name: path.posix.basename(req.query.path),
        url: storage.getUrl(req.params.collection, req.query.path),
        content_type: mime.lookup(req.query.path) || undefined,
        path: req.query.path,
      }
    });
  });

router.get('/attachment/:collection', validator.checkResult, function (req, res, next) {
  res.redirect(storage.getUrl(req.params.collection, req.query.path));
});

storage.installRouter(router);

module.exports = router;
