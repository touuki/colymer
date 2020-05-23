const path = require('path');
const fs = require('fs');
const bytes = require('bytes');
const multer = require('multer');
const os = require('os');

const { header } = require('express-validator');
const validator = require('../validator');
const config = require('../config');

class DefaultStorage {

  static getUrl(collection, queryPath) {
    if (os.type() == 'Windows_NT') {
      queryPath = queryPath.replace(/[\\:*?"<>|\f\n\r\t\v]/g, '_');
    }
    return config.default_storage_options.url_prefix + path.posix.join('/', collection, queryPath);
  }

  static getDirectlyUploadInfo(collection, queryPath) {
    const url = new URL('attachment/' + collection, config.default_storage_options.api_prefix);
    url.searchParams.set('path', queryPath);
    return {
      url: url.href,
      options: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      },
    };
  }

  static getFormUploadInfo(collection, queryPath) {
    const url = new URL('attachment/' + collection, config.default_storage_options.api_prefix);
    url.searchParams.set('path', queryPath);
    return {
      url: url.href,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data'
        },
      },
      form: {
        formField: 'file'
      }
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
    return path.join(config.default_storage_options.directory, collection, queryPath);
  }

  static installRouter(router) {
    const maxFileSize = bytes.parse(config.default_storage_options.max_file_size);

    router.post('/attachment/:collection', validator.collection, validator.path,
      header('content-length').custom((value) => parseInt(value) < maxFileSize).optional(),
      validator.checkResult, multer({
        dest: config.tmp_dir,
        limits: {
          files: 1,
          fields: 0,
          fileSize: maxFileSize
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
      header('content-length').custom((value) => parseInt(value) < maxFileSize).optional(),
      validator.checkResult, function (req, res, next) {
        const filename = Date.now() + '-' + Math.round(Math.random() * Math.pow(16, 8)).toString(16);
        const tmpPath = path.join(config.tmp_dir, filename);
        const writeStream = fs.createWriteStream(tmpPath);
        const pathname = DefaultStorage._getPath(req.params.collection, req.query.path);
        let length = 0;

        writeStream.on('error', function (error) {
          if (error !== 'aborted' && error !== '413 Payload Too Large'
            && error.code !== 'ERR_STREAM_DESTROYED') {
            next(error);
          }
          fs.unlink(tmpPath, (err) => err && console.error(err));
        });
        writeStream.on('finish', function () {
          DefaultStorage._moveFile(pathname, tmpPath, function (err) {
            if (err) return next(err);
            return res.status(201).send();
          });
        });
        req.on('data', function (data) {
          length += data.length;
          if (length > maxFileSize && !writeStream.destroyed) {
            res.set('Connection', 'close');
            res.status(413).send();
            writeStream.destroy('413 Payload Too Large');
          }
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