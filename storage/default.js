const path = require('path');
const fs = require('fs');
const bytes = require('bytes');
const multer = require('multer');

const { header } = require('express-validator');
const validator = require('../validator');

class DefaultStorage {

  constructor(options) {
    this.options = { ...options };
    this.options.tmp_dir = path.isAbsolute(this.options.tmp_dir) ? this.options.tmp_dir :
      path.join(__dirname, '..', this.options.tmp_dir);
    this.options.directory = path.isAbsolute(this.options.directory) ? this.options.directory :
      path.join(__dirname, '..', this.options.directory);
    this.options.url_prefix += this.options.url_prefix.endsWith('/') ? '' : '/';
    this.options.api_prefix += this.options.api_prefix.endsWith('/') ? '' : '/';
  }

  getUrl(collection, uploadPath) {
    return new URL(path.posix.join(collection, uploadPath), this.options.url_prefix).href;
  }

  getDirectlyUploadOptions(collection, uploadPath) {
    const url = new URL('attachment/' + collection, this.options.api_prefix);
    url.searchParams.set('path', uploadPath);
    return {
      url: url.href,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    };
  }

  getFormUploadOptions(collection, uploadPath) {
    const url = new URL('attachment/' + collection, this.options.api_prefix);
    url.searchParams.set('path', uploadPath);
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

  _moveFile(pathname, originalPath, callback) {
    fs.mkdir(path.dirname(pathname), { recursive: true }, function (err) {
      if (err) {
        fs.unlink(originalPath, (error) => error && console.error(error));
        return callback(err);
      }
      fs.rename(originalPath, pathname, callback);
    });
  }

  _getPath(collection, uploadPath) {
    return path.join(this.options.directory, collection, uploadPath);
  }

  installRouter(router) {
    const self = this;
    const maxFileSize = bytes.parse(this.options.max_file_size);

    router.post('/:collection',
      validator.isAlphanumeric('param', 'collection'),
      validator.path,
      validator.toBoolean('query', 'forbid_overwrite'),
      header('content-length').custom((value) => parseInt(value) < maxFileSize).optional(),
      validator.checkResult, function (req, res, next) {
        const pathname = self._getPath(req.params.collection, req.query.path);
        if (req.query.forbid_overwrite) {
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
        dest: this.options.tmp_dir,
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
        const pathname = self._getPath(req.params.collection, req.query.path);
        self._moveFile(pathname, req.file.path, function (err) {
          if (err) return next(err);
          return res.status(201).send();
        });
      }
    );

    router.put('/:collection',
      validator.isAlphanumeric('param', 'collection'),
      validator.path,
      validator.toBoolean('query', 'forbid_overwrite'),
      header('content-length').custom((value) => parseInt(value) < maxFileSize).optional(),
      validator.checkResult, function (req, res, next) {
        const pathname = self._getPath(req.params.collection, req.query.path);
        if (req.query.forbid_overwrite) {
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
        const tmpPath = path.join(self.options.tmp_dir, filename);
        const writeStream = fs.createWriteStream(tmpPath);
        const pathname = self._getPath(req.params.collection, req.query.path);
        let length = 0;

        writeStream.on('error', function (error) {
          if (error !== 'aborted' && error !== '413 Payload Too Large') {
            next(error);
          }
          fs.unlink(tmpPath, (err) => err && console.error(err));
        });
        writeStream.on('finish', function () {
          self._moveFile(pathname, tmpPath, function (err) {
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