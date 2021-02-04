const path = require('path');
const fs = require('fs');
const bytes = require('bytes');
const multer = require('multer');

const { header } = require('express-validator');
const validator = require('../validator');
const config = require('../config').default_storage_options;

class DefaultStorage {

  static getUrl(collection, uploadPath) {
    return config.url_prefix + path.posix.join('/', collection, uploadPath);
  }

  static getDirectlyUploadOptions(collection, uploadPath, overwrite) {
    const url = new URL('attachment/' + collection, config.api_prefix);
    url.searchParams.set('path', uploadPath);
    url.searchParams.set('overwrite', overwrite);
    return {
      url: url.href,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    };
  }

  static getFormUploadOptions(collection, uploadPath, overwrite) {
    const url = new URL('attachment/' + collection, config.api_prefix);
    url.searchParams.set('path', uploadPath);
    url.searchParams.set('overwrite', overwrite);
    return {
      url: url.href,
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      formData: {
        file: '$fileData'
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

  static _getPath(collection, uploadPath) {
    return path.join(config.directory, collection, uploadPath);
  }

  static installRouter(router) {
    const maxFileSize = bytes.parse(config.max_file_size);

    router.post('/:collection', validator.collection, validator.path, validator.overwrite,
      header('content-length').custom((value) => parseInt(value) < maxFileSize).optional(),
      validator.checkResult, function (req, res, next) {
        const pathname = DefaultStorage._getPath(req.params.collection, req.query.path);
        if (req.query.overwrite) {
          fs.access(pathname, function (err) {
            if (err) {
              next();
            } else {
              res.status(409).send();
            }
          })
        } else {
          next()
        }
      }, multer({
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

    router.put('/:collection', validator.collection, validator.path, validator.overwrite,
      header('content-length').custom((value) => parseInt(value) < maxFileSize).optional(),
      validator.checkResult, function (req, res, next) {
        const pathname = DefaultStorage._getPath(req.params.collection, req.query.path);
        if (req.query.overwrite) {
          fs.access(pathname, function (err) {
            if (err) {
              next();
            } else {
              res.status(409).send();
            }
          })
        } else {
          next()
        }
      }, function (req, res, next) {
        const filename = Date.now() + '-' + Math.round(Math.random() * Math.pow(16, 8)).toString(16);
        const tmpPath = path.join(config.tmp_dir, filename);
        const writeStream = fs.createWriteStream(tmpPath);
        const pathname = DefaultStorage._getPath(req.params.collection, req.query.path);
        let length = 0;

        writeStream.on('error', function (error) {
          if (error !== 'aborted' && error !== '413 Payload Too Large') {
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
        req.pipe(writeStream);

        const onData = function (data) {
          length += data.length;
          if (length > maxFileSize) {
            res.set('Connection', 'close');
            res.status(413).send();
            req.removeListener('data', onData);
            writeStream.destroy('413 Payload Too Large');
          }
        };
        req.on('data', onData);
        req.on('aborted', function () {
          writeStream.destroy('aborted');
        });
      }
    );
  }
};

module.exports = DefaultStorage;