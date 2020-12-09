const express = require('express');
const router = express.Router();

const { query } = require('express-validator');

const validator = require('../../validator');
const storage = require('../../storage');

router.get('/upload_options/:collection', validator.collection,
  query('isFormData').toBoolean(), validator.path,
  validator.checkResult, function (req, res, next) {
    res.status(200).json(req.query.isFormData ? storage.getFormUploadOptions(req.params.collection, req.query.path)
        : storage.getDirectlyUploadOptions(req.params.collection, req.query.path));
  });

router.get('/:collection', validator.collection, validator.path, validator.checkResult,
  function (req, res, next) {
    res.redirect(storage.getUrl(req.params.collection, req.query.path));
  });

storage.installRouter(router);

module.exports = router;
