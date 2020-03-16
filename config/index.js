var config = require('./develop.json');
if (typeof config.attachment === 'undefined') {
    config.attachment = {};
}

if(typeof config.attachment.dirname === 'undefined'){
    config.attachment.dirname = path.join(__dirname, '../public/attachment');
} else if(!path.isAbsolute(config.attachment.dirname)){
    config.attachment.dirname = path.join(__dirname, config.attachment.dirname);
}

module.exports = config; 