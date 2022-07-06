const express = require('express');
const router = express.Router();

const { query } = require('express-validator');

const validator = require('../../validator');
const { db } = require('../../mongo');
const storage = require('../../storage');

router.post('/', function (req, res, next) {
  db().collection('#node').insertOne({ active_time: Date.now() },
    function (error, result) {
      if (error) return next(error);
      res.status(201).json({ _id: result.insertedId });
    }
  );
});

router.put('/:node_id', validator.toObjectId('param', 'node_id'), validator.checkResult,
  function (req, res, next) {
    db().collection('#node').updateOne({ _id: req.params.node_id },
      { $set: { active_time: Date.now() } },
      { upsert: true }, function (error, result) {
        if (error) return next(error);
        if (result.matchedCount) {
          res.status(204).send();
        } else {
          res.status(404).send();
        }
      }
    );
  }
);

router.delete('/:node_id', validator.toObjectId('param', 'node_id'), validator.checkResult,
  function (req, res, next) {
    db().collection('#attachment').updateMany({ accept: req.params.node_id },
      { $unset: { accept: '' } }, function (error) {
        if (error) return next(error);
        db().collection('#node').deleteOne({ _id: req.params.node_id }, function (error, result) {
          if (error) return next(error);
          if (result.deletedCount)
            res.status(204).send();
          else
            res.status(404).send();
        });
      }
    )
  }
);

router.post('/:node_id/accept', validator.toObjectId('param', 'node_id'),
  validator.toBooleanOrUndefined('query', 'directly_transfer'),
  validator.checkResult, function (req, res, next) {
    db().collection('#attachment').findOneAndUpdate({
      accept: { $exists: false },
      'persist_info.directly_transfer': typeof req.query.directly_transfer === 'undefined' || req.query.directly_transfer ?
        req.query.directly_transfer : { $ne: true }
    }, {
      $set: {
        accept: req.params.node_id
      }
    }, {
      ignoreUndefined: true
    }, function (error, result) {
      if (error) return next(error);
      if (result.value) {
        result.value.upload_options = storage.getDirectlyUploadOptions(result.value.collection,
          result.value.persist_info.path);
        result.value.url = storage.getUrl(result.value.collection, result.value.persist_info.path);
        res.status(200).json(result.value);
      }
      else
        res.status(404).send();
    });
  }
);

router.post('/:node_id/finish/:task_id', validator.toObjectId('param', 'node_id'), validator.toObjectId('param', 'task_id'),
  validator.checkResult, function (req, res, next) {
    db().collection('#attachment').findOneAndDelete({ _id: req.params.task_id, accept: req.params.node_id },
      function (error, result) {
        if (error) return next(error);
        if (result.value) {
          db().collection(result.value.collection).updateOne({ _id: result.value.article_id }, req.query.error ? {
            $set: {
              'attachments.$[element].persist_info.saved': false,
              'attachments.$[element].persist_info.error': req.query.error,
            }
          } : {
              $set: {
                'attachments.$[element].persist_info.saved': true,
              },
              $unset: {
                'attachments.$[element].persist_info.error': '',
              }
            }, {
            arrayFilters: [{
              'element.original_url': result.value.original_url
            }],
            ignoreUndefined: true,
          }, function (error) {
            if (error) return next(error);
            res.status(204).send();
          });
        } else
          res.status(404).send();
      }
    );
  }
);

module.exports = router;