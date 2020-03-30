const express = require('express');
const { param, validationResult } = require('express-validator');
const router = express.Router();

const contentValidator = require('../validator').content;
const Content = require('../model').Content;
const mongodb = require('../utils/mongo');

router.delete('/document/:collection/:id', function (req, res, next) {
  mongodb().collection(req.params.collection).deleteOne({
    _id: req.params.id
  }, function (error, result) {
    if (error) return next(error);
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
    if (error) return next(error);
    if (result)
      res.status(200).json(new Content(result.content).toView());
    else
      res.status(404).send();
  });
});

router.post('/document/:collection/:id/content', contentValidator, function (req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  new Content(req.body).checkAttachments(function (err, content) {
    if (err) {
      return res.status(400).json({ errors: err });
    }
    const obj = content.toDB();
    mongodb().collection(req.params.collection).findOne({
      _id: req.params.id,
    }, {
      projection: { content: 1 }
    }, function (error, result) {
      if (error) return next(error);
      if (result) {
        // Update
        const original_content = new Content(result.content);
        const version = original_content.version;
        obj.version = version + 1;
        mongodb().collection(req.params.collection).updateOne({
          _id: req.params.id,
          'content.version': version
        }, {
          $set: { content: obj },
          $inc: { archive_count: 1 },
          $push: { archives: original_content.toDB() },
        }, {
          ignoreUndefined: true,
        }, function (error, result) {
          if (error) return next(error);
          if (result.matchedCount) {
            res.status(204).send();
          } else {
            res.status(503).send();
          }
        });
      }
      else {
        // Insert
        obj.version = 1;
        mongodb().collection(req.params.collection).insertOne({
          _id: req.params.id,
          content: obj,
          metadata: {},
          archives: [],
          archive_count: 0,
        }, {
          ignoreUndefined: true,
        }, function (error, result) {
          if (error) return next(error);
          res.status(201).send();
        });
      }
    });
  });
});

router.put('/document/:collection/:id/content', contentValidator, function (req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  new Content(req.body).checkAttachments(function (err, content) {
    if (err) {
      return res.status(400).json({ errors: err });
    }
    const version = content.version;
    const obj = content.toDB();
    if (version) {
      // Update
      obj.version = version + 1;
      mongodb().collection(req.params.collection).updateOne({
        _id: req.params.id,
        'content.version': version
      }, {
        $set: { content: obj },
      }, {
        ignoreUndefined: true,
      }, function (error, result) {
        if (error) return next(error);
        if (result.matchedCount) {
          res.status(204).send();
        } else {
          res.status(409).send();
        }
      });
    } else {
      // Insert
      obj.version = 1;
      mongodb().collection(req.params.collection).insertOne({
        _id: req.params.id,
        content: obj,
        metadata: {},
        archives: [],
        archive_count: 0,
      }, {
        ignoreUndefined: true,
      }, function (error, result) {
        if (error) return next(error);
        res.status(201).send();
      });
    }
  });
});

router.get('/document/:collection/:id/archive-count', function (req, res, next) {
  mongodb().collection(req.params.collection).findOne({
    _id: req.params.id
  }, {
    projection: { archive_count: 1 }
  }, function (error, result) {
    if (error) return next(error);
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
    if (error) return next(error);
    if (result) {
      const archives = [];
      for (const archive of result.archives) {
        archives.push(new Content(archive).toView());
      }
      res.status(200).json(archives);
    }
    else
      res.status(404).send();
  });
});

router.get('/document/:collection/:id/archive/:index', param('index').isInt().toInt(), function (req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  mongodb().collection(req.params.collection).findOne({
    _id: req.params.id
  }, {
    projection: { archives: 1 }
  }, function (error, result) {
    if (error) return next(error);
    if (result && result.archives && result.archives[req.params.index])
      res.status(200).json(new Content(result.archives[req.params.index]).toView());
    else
      res.status(404).send();
  });
});

module.exports = router;
