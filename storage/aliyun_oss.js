const path = require('path');
const crypto = require('crypto');

class AliyunOssStorage {

  constructor(options) {
    this.options = { ...options };
  }

  _signature(stringToSign) {
    const signature = crypto.createHmac('sha1', this.options.accessKeySecret);
    return signature.update(Buffer.from(stringToSign)).digest('base64');
  }

  getUrl(collection, uploadPath) {
    return new URL(path.posix.join(collection, uploadPath), `http://${this.options.bucket}.${this.options.endpoint}/`).href;
  }

  getDirectlyUploadOptions(collection, uploadPath) {
    const date = new Date().toUTCString();
    return {
      url: this.getUrl(collection, uploadPath),
      method: 'PUT',
      headers: {
        date,
        authorization: `OSS ${this.options.accessKeyId}:${this._signature(`PUT\n\n\n${date}\n${path.posix.join('/', this.options.bucket, collection, uploadPath)}`)}`
      }
    };
  }

  getFormUploadOptions(collection, uploadPath) {
    // not test yet
    const policy = Buffer.from(JSON.stringify({expiration:new Date(new Date().getTime() + 15*60*1000).toISOString(),conditions:[]})).toString('base64')
    return {
      url: this.getUrl(collection, uploadPath),
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      formData: {
        policy,
        Signature: this._signature(policy),
        OSSAccessKeyId: this.options.accessKeyId,
        key: path.posix.join(collection, uploadPath),
        file: '$fileData'
      }
    };
  }

  installRouter(router) { }
};

module.exports = AliyunOssStorage;