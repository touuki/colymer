const express = require('express');
const { checkSchema } = require('express-validator');
const router = express.Router();

const config = require('../config');
const mongodb = require('../utils/mongo');

const contentValidation = checkSchema({
  index: {
    in: 'params',
    isInt: true,
    toInt: true,
  },
  author_id: {
    in: 'body',
    isString: true,
    trim: true,
  },
  author_name: {
    in: 'body',
    isString: true,
    trim: true,
  },
  is_html: {
    in: 'body',
    toBoolean: true,
  },
  title: {
    in: 'body',
    isString: true,
    trim: true,
  },
  text: {
    in: 'body',
    isString: true,
  },
  category: {
    in: 'body',
    isString: true,
    trim: true,
  },
  url: {
    in: 'body',
    isURL: true,
  },
  labels: {
    in: 'body',
    toArray: true,
    customSanitizer: {
      options: (value) => {
        return Array.from(new Set(value));
      },
    },
  },
  'labels.*': {
    in: 'body',
    isString: true,
    trim: true,
    notEmpty: true,
  },
  attachments: {
    in: 'body',
    toArray: true,
  },
  'attachments.*.filename': {
    in: 'body',
    isString: true,
    trim: true,
  },
  'attachments.*.encoding': {
    in: 'body',
    isIn: {
      options: [["utf8", "utf16le", "latin1", "base64", "hex"]]
    },
  },
  'attachments.*.content': {
    in: 'body',
    isString: true,
  },
  version: {
    in: 'body',
    isInt: true,
    toInt: true,
  },
});

router.delete('/document/:collection/:id', function (req, res, next) {
  mongodb().collection(req.params.collection).deleteOne({
    _id: req.params.id
  }, function (error, result) {
    if (error) next(error);
    if (result.deletedCount)
      res.status(204).send();
    else
      res.status(404).send();
  });
});

router.get('/document/:collection/:id/content', function (req, res, next) {
  mongodb().collection(req.params.collection).findOne({
    _id: req.params.id
  }, {
    projection: { content: 1 }
  }, function (error, result) {
    if (error) next(error);
    if (result)
      res.status(200).json(Content.fromDB(result.content).toView());
    else
      res.status(404).send();
  });
});

router.post('/document/:collection/:_id/content', function (req, res, next) {
  const doc = createDocument(req.params._id, req.body);
  saveAttachments(req.params.collection, doc, function (error, result) {
    if (error) next(error);
    mongodb().collection(req.params.collection).updateOne({ _id: req.params._id }, doc, {
      upsert: true
    }, function (error, result) {
      if (error) next(error);
      res.status(204).send();
    });
  });
});

router.put('/document/:collection/:_id/content', function (req, res, next) {
  const doc = createDocument(req.params._id, req.body);
  saveAttachments(req.params.collection, doc, function (error, result) {
    if (error) next(error);
    mongodb().collection(req.params.collection).insertOne(doc, {
      upsert: true
    }, function (error, result) {
      if (error) next(error);
      res.status(204).send();
    });
  });
});

router.get('/document/:collection/:id/archive_count', function (req, res, next) {
  mongodb().collection(req.params.collection).findOne({
    _id: req.params.id
  }, {
    projection: { archive_count: 1 }
  }, function (error, result) {
    if (error) next(error);
    if (result)
      res.status(200).json({ archive_count: result.archive_count });
    else
      res.status(404).send();
  });
});

router.get('/document/:collection/:id/archives', function (req, res, next) {
  mongodb().collection(req.params.collection).findOne({
    _id: req.params.id
  }, {
    projection: { archives: 1 }
  }, function (error, result) {
    if (error) next(error);
    if (result) {
      const archives = [];
      for (const archive of result.archives) {
        archives.push(Content.fromDB(archive).toView());
      }
      res.status(200).json(archives);
    }
    else
      res.status(404).send();
  });
});

router.get('/document/:collection/:id/archive/:index', function (req, res, next) {
  mongodb().collection(req.params.collection).findOne({
    _id: req.params.id
  }, {
    projection: { archives: 1 }
  }, function (error, result) {
    if (error) next(error);
    const i = parseInt(req.params.index);
    if (result && result.archives && result.archives[i])
      res.status(200).json(Content.fromDB(result.archives[i]).toView());
    else
      res.status(404).send();
  });
});

module.exports = router;
