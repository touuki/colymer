const express = require('express');
const router = express.Router();

const { query } = require('express-validator');

const validator = require('../../validator');
const storage = require('../../storage');

router.get('/upload_options/:collection', validator.collection,
  query('isFormData').customSanitizer(value => value == 1 || value && value.toLowerCase() == 'true'),
  validator.path, validator.overwrite, validator.checkResult, function (req, res, next) {
    res.status(200).json(req.query.isFormData ?
      storage.getFormUploadOptions(req.params.collection, req.query.path, req.query.overwrite)
      : storage.getDirectlyUploadOptions(req.params.collection, req.query.path, req.query.overwrite));
  });

storage.installRouter(router);

module.exports = router;
