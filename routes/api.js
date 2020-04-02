const express = require('express');
const router = express.Router();

const { param, query, header } = require('express-validator');
const path = require('path');

const validator = require('../validator');
const Content = require('../model').Content;
const { StorageProxy, DefaultStorage } = require('../utils/attachment-storage');
const mongodb = require('../utils/mongo');

router.use(function (req, res, next) {
  if (req.get('Origin')) {
    res.header('Access-Control-Allow-Origin', req.get('Origin'));
    res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS,HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  }
  next();
});

router.all('/document/:collection/:id/*', validator.collection, validator.id);

router.delete('/document/:collection/:id',
  validator.checkResult, function (req, res, next) {
    mongodb().collection(req.params.collection).deleteOne({
      _id: req.params.id
    }, function (error, result) {
      if (error) return next(error);
      if (result.deletedCount)
        res.status(204).send();
      else
        res.status(404).send();
    });
  });

router.get('/document/:collection/:id/content',
  validator.checkResult, function (req, res, next) {
    mongodb().collection(req.params.collection).findOne({
      _id: req.params.id
    }, {
      projection: { content: 1 }
    }, function (error, result) {
      if (error) return next(error);
      if (result)
        res.status(200).json(new Content(result.content, req.params.collection, req.params.id).toView());
      else
        res.status(404).send();
    });
  });

router.post('/document/:collection/:id/content',
  validator.content, validator.checkResult, function (req, res, next) {
    const content = new Content(req.body, req.params.collection, req.params.id);
    StorageProxy.checkExistence(content.attachments, function (err) {
      if (err) {
        return res.status(400).json({ errors: err });
      }
      const obj = content.toDB();
      mongodb().collection(req.params.collection).findOne({
        _id: req.params.id,
      }, {
        projection: { content: 1 }
      }, function (error, result) {
        if (error) return next(error);
        if (result) {
          // Update
          const original_content = new Content(result.content, req.params.collection, req.params.id);
          const version = original_content.version;
          obj.version = version + 1;
          mongodb().collection(req.params.collection).updateOne({
            _id: req.params.id,
            'content.version': version
          }, {
            $set: { content: obj },
            $inc: { archive_count: 1 },
            $push: { archives: original_content.toDB() },
          }, {
            ignoreUndefined: true,
          }, function (error, result) {
            if (error) return next(error);
            if (result.matchedCount) {
              res.status(204).send();
            } else {
              res.status(503).send();
            }
          });
        }
        else {
          // Insert
          obj.version = 1;
          mongodb().collection(req.params.collection).insertOne({
            _id: req.params.id,
            content: obj,
            metadata: {},
            archives: [],
            archive_count: 0,
          }, {
            ignoreUndefined: true,
          }, function (error, result) {
            if (error) return next(error);
            res.status(201).send();
          });
        }
      });
    });
  });

router.put('/document/:collection/:id/content',
  validator.content, validator.checkResult, function (req, res, next) {
    const content = new Content(req.body, req.params.collection, req.params.id);
    StorageProxy.checkExistence(content.attachments, function (err) {
      if (err) {
        return res.status(400).json({ errors: err });
      }
      const version = content.version;
      const obj = content.toDB();
      if (version) {
        // Update
        obj.version = version + 1;
        mongodb().collection(req.params.collection).updateOne({
          _id: req.params.id,
          'content.version': version
        }, {
          $set: { content: obj },
        }, {
          ignoreUndefined: true,
        }, function (error, result) {
          if (error) return next(error);
          if (result.matchedCount) {
            res.status(204).send();
          } else {
            res.status(409).send();
          }
        });
      } else {
        // Insert
        obj.version = 1;
        mongodb().collection(req.params.collection).insertOne({
          _id: req.params.id,
          content: obj,
          metadata: {},
          archives: [],
          archive_count: 0,
        }, {
          ignoreUndefined: true,
        }, function (error, result) {
          if (error) return next(error);
          res.status(201).send();
        });
      }
    });
  });

router.get('/document/:collection/:id/archive-count',
  validator.checkResult, function (req, res, next) {
    mongodb().collection(req.params.collection).findOne({
      _id: req.params.id
    }, {
      projection: { archive_count: 1 }
    }, function (error, result) {
      if (error) return next(error);
      if (result)
        res.status(200).json({ archive_count: result.archive_count });
      else
        res.status(404).send();
    });
  });

router.get('/document/:collection/:id/archives',
  validator.checkResult, function (req, res, next) {
    mongodb().collection(req.params.collection).findOne({
      _id: req.params.id
    }, {
      projection: { archives: 1 }
    }, function (error, result) {
      if (error) return next(error);
      if (result) {
        const archives = [];
        for (const archive of result.archives) {
          archives.push(new Content(archive, req.params.collection, req.params.id).toView());
        }
        res.status(200).json(archives);
      }
      else
        res.status(404).send();
    });
  });

router.get('/document/:collection/:id/archive/:index',
  param('index').isInt().toInt(), validator.checkResult, function (req, res, next) {
    mongodb().collection(req.params.collection).findOne({
      _id: req.params.id
    }, {
      projection: { archives: 1 }
    }, function (error, result) {
      if (error) return next(error);
      if (result && result.archives && result.archives[req.params.index])
        res.status(200).json(new Content(result.archives[req.params.index], req.params.collection, req.params.id).toView());
      else
        res.status(404).send();
    });
  });

router.get('/document/:collection/:id/attachment-upload-method', query('filename').trim(),
  query('isFormData').toBoolean(), validator.checkResult, function (req, res, next) {
    let filename = path.win32.basename(req.query.filename).replace(/[\\/:*?"<>|]/g, '').replace(/\s/g, '+');
    let firstpart = filename;
    let extname = path.extname(filename);
    if (extname) {
      do {
        firstpart = firstpart.slice(0, -extname.length);
        extname = path.extname(firstpart);
      } while (extname && mime.types[extname.slice(1).toLowerCase()]);
    }
    let lastpart = filename.slice(firstpart.length);
    let randomPart = '.' + Date.now().toString('36');
    const cid = firstpart + randomPart + lastpart;
    res.status(200).json(StorageProxy.getUploadMethod({
      collection: req.params.collection,
      id: req.params.id,
      cid: cid
    }, req.query.isFormData));
  });

router.get('/document/:collection/:id/attachment/:cid',
  validator.cid, validator.checkResult, function (req, res, next) {
    res.redirect(StorageProxy.getUrl(req.params));
  });

if (StorageProxy.storage === DefaultStorage) {
  const bytes = require('bytes');
  const fs = require('fs');
  const storageConfig = require('../config').attachment_default_storage;
  const maxFileSize = bytes.parse(storageConfig.max_file_size);
  const multer = require('multer');
  const upload = multer({
    dest: storageConfig.uploads_tmpdir,
    limits: {
      files: 1,
      fields: 0
    }
  }).single('file');

  const checkAvailable = function (req, res, next) {
    DefaultStorage.exists(req.params, function (error, exist) {
      if (error) return next(error);
      if (exist)
        return res.status(409).send();
      else {
        next();
      }
    });
  };

  router.post('/document/:collection/:id/attachment/:cid', validator.cid,
    header('content-length').toInt().custom((value) => value < maxFileSize),
    validator.checkResult, checkAvailable, upload, function (req, res, next) {
      if(!req.file){
        return res.status(400).json({
          errors:[{
            message: "No file found."
          }]
        });
      }
      DefaultStorage.moveFile(req.params, req.file.path, function (err) {
        if (err) {
          if (err.code === 'EEXIST') {
            return res.status(409).send();
          } else {
            return next(err);
          }
        }
        return res.status(201).send();
      });
    });

  router.put('/document/:collection/:id/attachment/:cid', validator.cid,
    header('content-length').toInt().custom((value) => value < maxFileSize),
    validator.checkResult, checkAvailable, function (req, res, next) {
      const filename = req.params.cid + '.' + Math.round(Math.random() * 1E9);
      const pathname = path.join(storageConfig.uploads_tmpdir, filename);
      const writeStream = fs.createWriteStream(pathname);
      writeStream.on('error', function (error) {
        if (error !== 'aborted') {
          next(error);
        }
        fs.unlink(pathname, (error) => error && console.error(error));
      });
      writeStream.on('finish', function () {
        DefaultStorage.moveFile(req.params, pathname, function (err) {
          if (err) {
            if (err.code === 'EEXIST') {
              return res.status(409).send();
            } else {
              return next(err);
            }
          }
          return res.status(201).send();
        });
      });
      req.on('aborted', function () {
        writeStream.destroy('aborted');
      });
      req.pipe(writeStream);
    });
}

module.exports = router;
