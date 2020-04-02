const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const storageConfig = require('../config').attachment_default_storage;

class DefaultStorage {

  static getUrl(attachment) {
    return path.posix.join(storageConfig.url_prefix, attachment.collection, attachment.id,
      attachment.cid);
  }

  static getUploadMethod(attachment, isFormData) {
    if (isFormData) {
      return {
        method: 'POST',
        url: path.posix.join('/api/document', attachment.collection,
          attachment.id, 'attachment', attachment.cid),
        headers: [{
          name: "Content-Type",
          value: "multipart/form-data"
        }],
        formField: 'file',
        cid: attachment.cid
      };
    } else {
      return {
        method: 'PUT',
        url: path.posix.join('/api/document', attachment.collection,
          attachment.id, 'attachment', attachment.cid),
        headers: [{
          name: "Content-Type",
          value: "application/octet-stream"
        }],
        cid: attachment.cid
      };
    }
  }

  static checkExistence(attachments, callback) {
    let i = 0;
    const _callback = function (error, exist, attachment) {
      if (error) return callback(error);
      if (!exist) {
        return callback({
          cid: attachment.cid,
          message: `Attachment ${attachment.cid} does not exist.`
        });
      }
      if (i < attachments.length) {
        this.exists(attachments[i++], _callback);
      } else {
        callback(null);
      }
    }
    if (i < attachments.length) {
      this.exists(attachments[i++], _callback);
    } else {
      callback(null);
    }
  }

  static exists(attachment, callback) {
    fs.access(this.getPath(attachment), function (err) {
      if (err) {
        callback(null, false, attachment);
      } else {
        callback(null, true, attachment);
      }
    });
  }

  static moveFile(attachment, originalPath, callback) {
    const newPath = this.getPath(attachment)
    fs.mkdir(path.dirname(newPath), { recursive: true }, function (err) {
      if (err) {
        fs.unlink(originalPath, (error) => error && console.error(error));
        return callback(err);
      }
      fs.link(originalPath, newPath, function (err) {
        fs.unlink(originalPath, (error) => error && console.error(error));
        // originalPath and newPath should be on the same device, otherwise a 'EXDEV' error will raise.
        callback(err);
      });
    });
  }

  static writeFile(attachment, buffer, callback) {
    const newPath = this.getPath(attachment)
    fs.mkdir(path.dirname(newPath), { recursive: true }, function (err) {
      if (err) {
        return callback(err);
      }
      fs.writeFile(newPath, buffer, {
        flag: 'wx'
      }, callback);
    });
  }

  static getPath(attachment) {
    return path.join(storageConfig.storage_dir, attachment.collection,
      attachment.id, attachment.cid)
  }
};

class StorageProxy {

  static checkExistence(attachments, callback) {
    return this.storage.checkExistence(attachments, callback);
  }

  static getUploadMethod(attachment, isFormData) {
    return this.storage.getUploadMethod(attachment, isFormData);
  }

  static getUrl(attachment) {
    return this.storage.getUrl(attachment);
  }

}
StorageProxy.storage = DefaultStorage;

module.exports.StorageProxy = StorageProxy;
module.exports.DefaultStorage = DefaultStorage;