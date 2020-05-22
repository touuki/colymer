const path = require('path');
const storage = require('../storage');
const mime = require('mime-types');
const $ = require('cheerio');

module.exports = {
  resolveAttachments: function (article) {
    if (!article.content_type.startsWith('text/html')) {
      return article;
    }
    if (!article.attachments) {
      article.attachments = new Array();
    }
    const root = $(article.content);
    $('img,embed,object,video,audio,source', root).each((i, e) => {
      const element = $(e, root);
      const src = element.attr('src')
      if (src && !(src.startsWith('data:') || src.startsWith('cid:'))) {
        const id = Math.round(Math.random() * Math.pow(16, 10)).toString(16);
        article.attachments.push({
          id: id,
          original_url: src,
          content_type: element.attr('type'),
          metadata: {
            width: element.attr('width'),
            height: element.attr('height')
          }
        });
        element.attr('src', 'cid:' + id);
      }
    });
    article.content = $.html(root, { decodeEntities: false });
  },
  attachmentInfo: function(collection, queryPath){
    const obj = {
      filename: path.posix.basename(queryPath),
      url: storage.getUrl(collection, queryPath),
      path: queryPath,
    };
    const content_type = mime.lookup(queryPath);
    if (content_type) {
      obj.content_type = content_type;
    }
    return obj;
  }
}