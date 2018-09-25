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
 * @param  {Object} obj
 * @param  {string} obj.root - root dir of hexo site
 * @param  {string} obj.source - source dir of hexo
 * @param  {string} obj.src - swagger config src
 * @param  {string} obj.dist - swagger config dist
 * @param  {string} obj.projName - the name of swagger project
 * @return {function}
 */
function ejsRef({ root, source, src, dist, projName }) {
  return function(ref, type, srcStack = []) {
    const refPath = toRealPath(ref);

    // build real path
    srcStack = srcStack.map(function(path, index) {
      return index === 0 ? path: toRealPath(path);
    });

    let json = {};
    try {
      // if not circular reference
      if (srcStack.indexOf(refPath) === -1) {
        json = yaml.safeLoad(fs.readFileSync(refPath, 'utf8'));
      }
      // if type is a schema $ref
      if (type === 'schema') {
        // add custom type to json
        json._custom = {
          type: ref.replace(/^#\/components\/schemas\//, ''),
          path: ref.replace(/^#/, `${root}${dist}/${projName}`) + '.html',
        }
      }
    } catch (e) {
      json = '' + e;
    }

    return json 
    
    function toRealPath(ref) {
      return pathFn.resolve(source, src, projName, ref.replace(/^#\//, '') + '.oas3')
    }
  }
}

function oas3Renderer(data, options) {
  const { root } = this.config;
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
    srcStack: [data.path],
    ref: ejsRef({ root, source: this.source_dir, src, dist, projName }),
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