const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

class AttachmentStorage {
  /**
   * @param {typeof AttachmentStorage} storage
   */
  static set storage(storage) {
    this._storage = storage;
  }

  static get storage() {
    return this._storage || this;
  }

  static checkExistence(attachments, callback) {
    const errors = [];
    let i = 0;
    const _callback = function (error) {
      if (error) {
        errors.push(error);
      }
      if (i < attachments.length) {
        this.storage._checkExistence(attachments[i++], _callback);
      } else {
        callback(errors);
      }
    }
    this.storage._checkExistence(attachments[i++], _callback);
  }

  static getUploadMethod(collection, id, filename, isFormData) {
    filename = path.win32.basename(filename);
    filename = filename.replace(/[\\/:*?"<>|]/g, '');
    filename = filename.replace(/\s/g, '+');
    let firstpart = filename;
    let extname = path.extname(filename);
    if (extname) {
      do {
        firstpart = firstpart.slice(0, -extname.length);
        extname = path.extname(firstpart);
      } while (extname && mime.types[extname.slice(1).toLowerCase()]);
    }
    let lastpart = filename.slice(firstpart.length);
    let randomPart = '.' + new Date().getTime().toString('36');
    const cid = firstpart + randomPart + lastpart;
    return this.storage._getUploadMethod({ collection, id, cid }, isFormData);
  }

  static getUrl(attachment) {
    return this.storage._getUrl(attachment);
  }

  static _getUrl(attachment) {
    return path.posix.join('/attachment', attachment.collection, attachment.id,
      attachment.cid);
  }

  static _getUploadMethod(attachment, isFormData) {
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

  static _checkExistence(attachment, callback) {
    fs.access(path.join(__dirname, '..', 'public', 'attachment', attachment.collection,
      attachment.id, attachment.cid), function (err) {
        if (err) {
          callback({
            cid: attachment.cid,
            message: `Attachment ${attachment.cid} does not exist.`
          });
        } else {
          callback(null);
        }
      });
  }
}

module.exports = AttachmentStorage;