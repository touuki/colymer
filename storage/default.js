const path = require('path');
const fs = require('fs');
const bytes = require('bytes');
const multer = require('multer');
const os = require('os');

const { header } = require('express-validator');
const validator = require('../validator');
const storageConfig = require('../config').default_storage_options;

class DefaultStorage {

  static getUrl(collection, queryPath) {
    if (os.type() == 'Windows_NT') {
      queryPath = queryPath.replace(/[\\:*?"<>|\f\n\r\t\v]/g, '_');
    }
    return storageConfig.url_prefix + path.posix.join('/', collection, queryPath);
  }

  static getDirectlyUploadMethod(collection, queryPath) {
    const url = new URL('attachment/' + collection, storageConfig.api_prefix);
    url.searchParams.set('path', queryPath);
    return {
      method: 'PUT',
      url: url.href,
      headers: [{
        name: "Content-Type",
        value: "application/octet-stream"
      }]
    };
  }

  static getFormUploadMethod(collection, queryPath) {
    const url = new URL('attachment/' + collection, storageConfig.api_prefix);
    url.searchParams.set('path', queryPath);
    return {
      method: 'POST',
      url: url.href,
      headers: [{
        name: "Content-Type",
        value: "multipart/form-data"
      }],
      formField: 'file'
    };
  }

  static _moveFile(pathname, originalPath, callback) {
    fs.mkdir(path.dirname(pathname), { recursive: true }, function (err) {
      if (err) {
        fs.unlink(originalPath, (error) => error && console.error(error));
        return callback(err);
      }
      fs.rename(originalPath, pathname, callback);
    });
  }

  static _getPath(collection, queryPath) {
    if (os.type() == 'Windows_NT') {
      queryPath = queryPath.replace(/[\\:*?"<>|\f\n\r\t\v]/g, '_');
    }
    return path.join(storageConfig.directory, collection, queryPath);
  }

  static installRouter(router) {
    const maxFileSize = bytes.parse(storageConfig.max_file_size);

    router.post('/attachment/:collection', validator.collection, validator.path,
      header('content-length').custom((value) => parseInt(value) < maxFileSize),
      validator.checkResult, multer({
        dest: storageConfig.uploads_tmpdir,
        limits: {
          files: 1,
          fields: 0
        }
      }).single('file'),
      function (req, res, next) {
        if (!req.file) {
          return res.status(400).json({
            errors: [{
              message: "No file found."
            }]
          });
        }
        const pathname = DefaultStorage._getPath(req.params.collection, req.query.path);
        DefaultStorage._moveFile(pathname, req.file.path, function (err) {
          if (err) return next(err);
          return res.status(201).send();
        });
      }
    );

    router.put('/attachment/:collection', validator.collection, validator.path,
      header('content-length').custom((value) => parseInt(value) < maxFileSize),
      validator.checkResult, function (req, res, next) {
        const filename = Date.now() + '-' + Math.round(Math.random() * Math.pow(16, 8)).toString(16);
        const tmpPath = path.join(storageConfig.uploads_tmpdir, filename);
        const writeStream = fs.createWriteStream(tmpPath);
        const pathname = DefaultStorage._getPath(req.params.collection, req.query.path);
        writeStream.on('error', function (error) {
          if (error !== 'aborted') {
            next(error);
          }
          fs.unlink(tmpPath, (error) => error && console.error(error));
        });
        writeStream.on('finish', function () {
          DefaultStorage._moveFile(pathname, tmpPath, function (err) {
            if (err) return next(err);
            return res.status(201).send();
          });
        });
        req.on('aborted', function () {
          writeStream.destroy('aborted');
        });
        req.pipe(writeStream);
      }
    );
  }
};

module.exports = DefaultStorage;