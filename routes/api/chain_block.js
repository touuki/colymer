const express = require('express');
const router = express.Router();

const { query, matchedData } = require('express-validator');

const validator = require('../../validator');
const { db } = require('../../mongo');

router.get('/:chain_id/recent',
  query('max_top_id').isNumeric({ no_symbols: true }).optional(),
  validator.checkResult, function (req, res, next) {
    db().collection('#chain_block').findOne({
      chain_id: req.params.chain_id,
      top_id: req.query.max_top_id ? { '$lt': req.query.max_top_id } : undefined
    }, {
      sort: { top_id: -1 },
      ignoreUndefined: true,
      collation: {
        locale: 'en_US',
        numericOrdering: true
      }
    }, function (error, result) {
      if (error) return next(error);
      if (result)
        res.status(200).json(result);
      else
        res.status(404).send();
    }
    );
  }
);

router.post('/:chain_id',
  validator.chain_block,
  validator.checkResult, function (req, res, next) {
    const body = matchedData(req, {
      locations: ['body']
    });
    body.chain_id = req.params.chain_id

    if (body.top_id - body.bottom_id < 0) {
      res.status(400).json({
        error: {
          msg: 'top_id should not less than bottom_id'
        }
      });
      return
    }

    db().collection('#chain_block').insertOne(body, {
      ignoreUndefined: true,
      checkKeys: true,
    }, function (error, result) {
      if (error) return next(error);
      res.status(201).json({
        _id: result.insertedId
      });
    });
  }
);

router.put('/:chain_id/:_id',
  validator.toObjectId('param', '_id'),
  validator.chain_block,
  validator.checkResult, function (req, res, next) {
    const body = matchedData(req, {
      locations: ['body']
    });

    if (body.top_id - body.bottom_id < 0) {
      res.status(400).json({
        error: {
          msg: 'top_id should not less than bottom_id'
        }
      });
      return
    }

    db().collection('#chain_block').updateOne({
      _id: req.params._id,
      chain_id: req.params.chain_id
    }, { $set: body }, { ignoreUndefined: true }, function (error, result) {
      if (error) return next(error);
      if (result.matchedCount) {
        res.status(204).send();
      } else {
        res.status(404).send();
      }
    });
  }
);

router.delete('/:chain_id/:_id',
  validator.toObjectId('param', '_id'),
  validator.checkResult, function (req, res, next) {
    db().collection('#chain_block').deleteOne({
      _id: req.params._id,
      chain_id: req.params.chain_id
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