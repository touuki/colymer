const express = require('express');
const router = express.Router();

const { query } = require('express-validator');

const validator = require('../../validator');
const storage = require('../../storage');

router.get('/upload_options/:collection',
  validator.isAlphanumeric('param', 'collection'),
  validator.toBoolean('query', 'isFormData'),
  validator.path, validator.checkResult, function (req, res, next) {
    res.status(200).json(req.query.isFormData ?
      storage.getFormUploadOptions(req.params.collection, req.query.path)
      : storage.getDirectlyUploadOptions(req.params.collection, req.query.path));
  }
);

storage.installRouter(router);

module.exports = router;
