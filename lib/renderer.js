'use strict';

const fs = require('fs');
const pathFn = require('path');
const lodash = require('lodash');
const ejs = require('ejs');
const yaml = require('js-yaml');
const MarkdownIt = require('markdown-it')({
  html: true
});
const swaggerConf = require('./conf');

/**
 * [ejsRef description]
 * @param  {string} source_dir - source dir of hexo
 * @param  {string} src - swagger src
 * @param  {string} projName - the name of swagger project
 * @param  {string} dist - swagger dist
 * @return {function}
 */
function ejsRef(source_dir, src, projName, dist) {
  return function(path, type) {
    const refPath = pathFn.resolve(source_dir, src, projName, path.replace(/^#\//, '') + '.oas3');
    let json = {};
    try {
      json = yaml.safeLoad(fs.readFileSync(refPath, 'utf8'));

      // if type is a schema $ref
      if (type === 'schema') {
        // add custom type to json
        json._custom = {
          type: path.replace(/^#\/components\/schemas\//, ''),
          path: path.replace(/^#/, `/${dist}/${projName}`) + '.html',
        }
      }
    } catch (e) {
      json = '' + e;
    }

    return json   
  }
}

function oas3Renderer(data, options) {
  const { src, dist } = swaggerConf(this.config);

  // convert yaml 2 json
  const swaggerJSON = yaml.load(data.text);

  // get the name & path of project
  const swaggerPath = pathFn.resolve(this.source_dir, src); // swagger source path
  const projName = data.path.replace(swaggerPath, '').split(pathFn.sep)[1];
  const projPath = pathFn.resolve(this.source_dir, src, projName);

  // generate relative file path
  const relativePath = pathFn.relative(projPath, data.path).split(pathFn.sep);

  // get swagger type by relative path
  let swaggerType = '';

  if (relativePath[0] == 'index.oas3') {
    swaggerType = 'index';
  } else if (relativePath[0] == 'paths') {
    swaggerType = 'paths';
  } else if (relativePath[0] == 'components') {
    swaggerType = ['components', relativePath[1]].join('.')
  }

  // drop tail index
  const swaggerFile = relativePath.pop();

  if (swaggerFile !== 'index.oas3') {
    relativePath.push(swaggerFile.replace(/(.*)\.oas3/, '$1'));
  }

  // ejs template & data conf
  const templateMap = {
    'index': pathFn.resolve(__dirname, 'template/index.ejs'),
    'paths': pathFn.resolve(__dirname, 'template/paths.ejs'),
    'components.schemas': pathFn.resolve(__dirname, 'template/schema.ejs')
  };

  const dataMap = {
    'index': {
      swagger: swaggerJSON
    },
    'paths': {
      paths: swaggerJSON,
      path: relativePath.slice(1) // may be change a suitable name
    },
    'components.schemas': {
      typeDef: '#',
      name: relativePath[relativePath.length-1], 
      schema: swaggerJSON
    }
  };

  // get template & data by swagger type
  const ejsTemplate = templateMap[swaggerType];
  const ejsData = Object.assign({
    ref: ejsRef(this.source_dir, src, projName, dist),
    _: lodash
  }, dataMap[swaggerType])


  if (!ejsTemplate) return null;
  
  return new Promise(function(resolve, reject) {
    ejs.renderFile(ejsTemplate, ejsData, null, function(err, content) {
      if (err) {
        throw err
      }
      // handle <nop> tag
      content = content
        .replace(/<\/nop>(\s*?)<nop>/g, '</nop>\n<nop>')
        .replace(/<nop>([\s\S]*?)<\/nop>/g, function(match, $1) {
          return $1.replace(/\r?\n/g, '')
        });

      // remove indent
      content = content.split(/\r?\n/).map(function(line) {
        return line.replace(/^[ ]*/, '');
      }).join('\n')

      const HTML = MarkdownIt.render(content);
      resolve(HTML);
    })
  });
};

module.exports = {
  oas3Renderer
}