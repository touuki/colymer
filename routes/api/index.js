const express = require('express');
const router = express.Router();

router.use(function (req, res, next) {
  if (req.get('Origin')) {
    res.header('Access-Control-Allow-Origin', req.get('Origin'));
    res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS,HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  }
  next();
});

router.use('/article', require('./article'));
router.use('/attachment', require('./attachment'));
router.use('/download', require('./download'));

module.exports = router;
