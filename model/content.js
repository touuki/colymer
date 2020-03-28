const mime = require('mime-types');

class Content {
  constructor(obj) {
    this.author_id = typeof obj.author_id === 'string' ? obj.author_id : '';
    this.author_name = typeof obj.author_name === 'string' ? obj.author_name : '';
    this.is_html = obj.is_html ? true : false;
    this.title = typeof obj.title === 'string' ? obj.title : '';
    this.text = typeof obj.text === 'string' ? obj.text : '';
    this.time = Number.isInteger(obj.time) ? obj.time : 0;
    this.category = typeof obj.category === 'string' ? obj.category : '';
    this.original_url = typeof obj.original_url === 'string' ? obj.original_url : '';
    this.labels = obj.labels instanceof Array ? ((arr) => {
      let obj = {};
      return arr.filter((item) =>
        typeof item === 'string' && item !== '' && !obj.hasOwnProperty(item) ?
          (obj[item] = true) : false);
    })(obj.labels) : [];
    this.attachments = obj.attachments instanceof Array ? ((arr) => {
      let obj = {};
      return arr.filter((item) => {
        if (typeof item.cid === 'string' && item.cid !== '' && !obj.hasOwnProperty(item.cid)) {
          obj[item.cid] = true
          item.original_url = typeof item.original_url === 'string' ? item.original_url : '';
          item.content_type = typeof item.content_type === 'string' ? item.content_type
            : mime.lookup(item.cid) || '';
          return true;
        }
        return false;
      });
    })(obj.attachments) : [];
    this.version = Number.isInteger(obj.version) ? obj.version : 0;
  }

  checkAttachments(callback) {
    // TODO
    callback(null, this);
  }

  toView() {
    const obj = {
      author_id: this.author_id,
      author_name: this.author_name,
      is_html: this.is_html,
      title: this.title,
      text: this.text, // TODO cid convert
      time: new Date(this.time).toISOString(),
      category: this.category,
      original_url: this.original_url,
      labels: [],
      attachments: [],
      version: this.version,
    };
    for (const label of this.labels) {
      obj.labels.push(label);
    }
    for (const element of this.attachments) {
      const attachment = {
        cid: element.cid,
        original_url: element.original_url,
        content_type: element.content_type,
        url: element.cid, // TODO
      };
      obj.attachments.push(attachment);
    }
    return obj;
  }

  toDB() {
    const obj = {
      labels: [],
      attachments: [],
      version: this.version,
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