const express = require('express');
const router = express.Router();

const validator = require('../../validator');
const { db } = require('../../mongo');

router.post('/', function (req, res, next) {
  db().collection('#node').insertOne({ active_time: Date.now() }, function (error, result) {
    if (error) return next(error);
    res.status(201).json({ _id: result.insertedId });
  });
});

router.put('/:_id', validator._id, validator.checkResult, function (req, res, next) {
  db().collection('#node').updateOne({ _id: req.params._id }, { $set: { active_time: Date.now() } },
    { upsert: true }, function (error, result) {
      if (error) return next(error);
      if (result.matchedCount) {
        res.status(204).send();
      } else {
        res.status(404).send();
      }
    });
});

router.delete('/:_id', validator._id, validator.checkResult, function (req, res, next) {
  db().collection('#attachment').updateMany({ accept: req.params._id }, { $unset: { accept: '' } }, function (error) {
    if (error) return next(error);
    db().collection('#node').deleteOne({ _id: req.params._id }, function (error, result) {
      if (error) return next(error);
      if (result.deletedCount)
        res.status(204).send();
      else
        res.status(404).send();
    });
  })
});

router.post('/:_id/accept', validator._id, validator.checkResult, function (req, res, next) {
  db().collection('#attachment').findOneAndUpdate({ accept: { $exists: false }, error: { $exists: false } },
    { $set: { accept: req.params._id } }, function (error, result) {
      if (error) return next(error);
      if (result.value)
        res.status(200).json(result.value);
      else
        res.status(404).send();
    });
});

router.post('/:_id/error', validator._id, validator.download.error, validator.checkResult, function (req, res, next) {
  db().collection('#attachment').updateOne({ _id: req.body._id, accept: req.params._id },
    {
      $set: { error: req.body.error },
      $unset: { accept: '' }
    },
    function (error, result) {
      if (error) return next(error);
      if (result.matchedCount) {
        res.status(204).send();
      } else {
        res.status(404).send();
      }
    });
});

router.post('/:_id/finish', validator._id, validator.download.finish, validator.checkResult, function (req, res, next) {
  db().collection(req.body.collection).updateOne({ _id: req.body.article_id }, {
    $set: {
      'attachments.$[element].filename': req.body.filename,
      'attachments.$[element].path': req.body.path,
      'attachments.$[element].content_type': req.body.content_type
    }
  }, {
    arrayFilters: [{
      'element.original_url': req.body.original_url
    }],
    ignoreUndefined: true,
  }, function (error) {
    if (error) return next(error);
    db().collection('#attachment').deleteOne({ _id: req.body._id, accept: req.params._id },
      function (error, result) {
        if (error) return next(error);
        if (result.deletedCount)
          res.status(204).send();
        else
          res.status(404).send();
      });
  });
});

module.exports = router;