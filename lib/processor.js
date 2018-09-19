'use strict';

const pathFn = require('path')
const Promise = require('bluebird');
const yfm = require('hexo-front-matter');
const yaml = require('js-yaml');
const swaggerConf = require('./conf');

// output oas3 file to swagger dist path
const oas3FileProcessor = (ctx) => (file) => {
  const { src, dist } = swaggerConf(ctx.config);
  const Page = ctx.model('Page');
  const path = file.path;
  const doc = Page.findOne({ source: path });

  if (file.type === 'delete') {
    if (doc) return doc.remove();
    return;
  }

  return Promise.all([
    file.stat(),
    file.read()
  ]).spread((stats, content) => {
    const data = yfm(content);
    const output = ctx.render.getOutput(path);
    const extname = pathFn.extname(path);
    const doc = Page.findOne({ source: path });

    data.source = path;
    data.raw = content;
    // set file output path
    data.path = `${path.substring(0, path.length - extname.length)}.${output}`
                  .replace(new RegExp(`^${src}`), dist);
                  
    if (doc) return doc.replace(data);
    return Page.insert(data);
  });
}


// set swagger data to site data
const oas3DataProcessor = (ctx) => (file) => {
  const { src } = swaggerConf(ctx.config);
  const Data = ctx.model('Data');
  const path = file.params.path;
  const extname = pathFn.extname(path);
  const id = path.substring(0, path.length - extname.length);
  const doc = Data.findById(id);

  if (file.type === 'delete') {
    if (doc) return doc.remove();
    return;
  }

  return file.read().then(content => {
    const json = yaml.load(content);
    return Data.save({
      _id: id.replace(new RegExp(`^${src}\/`), ''),
      data: json
    });
  })
}

module.exports = {
  oas3FileProcessor,
  oas3DataProcessor
}