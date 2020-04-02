const mime = require('mime-types');
const StorageProxy = require('../utils/attachment-storage').StorageProxy;

class Content {
  constructor(obj, collection, id) {
    obj = obj || {};
    this.collection = collection;
    this.id = id;
    this.author_id = typeof obj.author_id === 'string' ? obj.author_id : '';
    this.author_name = typeof obj.author_name === 'string' ? obj.author_name : '';
    this.is_html = obj.is_html ? true : false;
    this.title = typeof obj.title === 'string' ? obj.title : '';
    this.text = typeof obj.text === 'string' ? obj.text : '';
    this.time = obj.time instanceof Date ? obj.time : null;
    this.category = typeof obj.category === 'string' ? obj.category : '';
    this.original_url = typeof obj.original_url === 'string' ? obj.original_url : '';
    this.labels = Array.isArray(obj.labels) ? ((arr) => {
      let obj = {};
      return arr.filter((item) =>
        typeof item === 'string' && item !== '' && !obj.hasOwnProperty(item) ?
          (obj[item] = true) : false);
    })(obj.labels) : [];
    this.attachments = Array.isArray(obj.attachments) ? ((arr) => {
      let obj = {};
      return arr.filter((item) => {
        if (typeof item.cid === 'string' && item.cid !== '' && !obj.hasOwnProperty(item.cid)) {
          obj[item.cid] = true
          item.collection = collection;
          item.id = id;
          item.original_url = typeof item.original_url === 'string' ? item.original_url : '';
          item.content_type = typeof item.content_type === 'string' ? item.content_type
            : mime.lookup(item.cid) || '';
          return true;
        }
        return false;
      });
    })(obj.attachments) : [];
    this.version = obj.version instanceof Date ? obj.version : null;
  }

  toView() {
    const obj = {
      author_id: this.author_id,
      author_name: this.author_name,
      is_html: this.is_html,
      title: this.title,
      text: this.text, // TODO cid convert
      time: this.time ? this.time.toISOString() : null,
      category: this.category,
      original_url: this.original_url,
      labels: [],
      attachments: [],
      version: this.version ? this.version.toISOString() : null,
    };
    for (const label of this.labels) {
      obj.labels.push(label);
    }
    for (const element of this.attachments) {
      const attachment = {
        cid: element.cid,
        original_url: element.original_url,
        content_type: element.content_type,
        url: StorageProxy.getUrl(element),
      };
      obj.attachments.push(attachment);
    }
    return obj;
  }

  toDB() {
    const obj = {
      labels: [],
      attachments: [],
      version: new Date(),
    };
    this.author_id && (obj.author_id = this.author_id);
    this.author_name && (obj.author_name = this.author_name);
    this.is_html && (obj.is_html = this.is_html);
    this.title && (obj.title = this.title);
    this.text && (obj.text = this.text); // TODO cid convert
    this.time && (obj.time = this.time);
    this.category && (obj.category = this.category);
    this.original_url && (obj.original_url = this.original_url);
    for (const label of this.labels) {
      obj.labels.push(label);
    }
    for (const element of this.attachments) {
      const attachment = {
        cid: element.cid,
      };
      element.original_url && (attachment.original_url = element.original_url);
      element.content_type && (attachment.content_type = element.content_type);
      obj.attachments.push(attachment);
    }
    return obj;
  }
}

module.exports = Content;