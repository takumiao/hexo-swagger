'use strict';

const fs = require('fs');
const pathFn = require('path');
const lodash = require('lodash');
const ejs = require('ejs');
const yaml = require('js-yaml');
const stripIndent = require('strip-indent');
const util = require('hexo-util');
const highlight = util.highlight;
const MarkdownIt = require('markdown-it')({
  html: true,
  highlight: function(code, lang) {
    return highlight(code, {
      lang: lang,
      gutter: false,
      wrap: false
    });
  }
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
  return function(obj, type, srcStack = []) {
    const ref = obj.$ref;
    const extname = pathFn.extname(ref).slice(1); // get suffix name
    const refPath = toRealPath(ref, extname);
  
    // build real path
    srcStack = srcStack.map(function(path, index) {
      return index === 0 ? path: toRealPath(path);
    });

    let json = {};
    try {
      // if not circular reference
      if (srcStack.indexOf(refPath) === -1) {
        if (~['', 'oas3', 'yml'].indexOf(extname)) {
          json = yaml.safeLoad(fs.readFileSync(refPath, 'utf8'));
        } else if (extname === 'json') {
          json = JSON.parse(fs.readFileSync(refPath, 'utf8'));
        }
      }
      // if type is a schema $ref
      if (type === 'schema') {
        // add custom type to json
        json._custom = {
          type: ref.replace(/^#\/components\/schemas\//, ''),
          path: ref.replace(/^#/, `${root}${dist}/${projName}`) + '.html',
        }
      }
    } catch (err) {
      console.warn(err);
      json = '' + err;
    }

    const overwriteProps = lodash.merge({}, obj);
    delete overwriteProps.$ref;

    return Object.assign(json, overwriteProps); 
    
    function toRealPath(ref, extname) {
      // if not extname add '.oas3' as suffix，other do nothing
      return pathFn.resolve(
        source, src, projName, 
        ref.replace(/^#\//, '') + (!extname ? '.oas3' : ''));
    }
  }
}

function ejsExample(ref) {
  return function _example (val) {
    let ret;
    if (val && typeof val === 'object') {
      if (Array.isArray(val)) {
        ret = val.map(item => _example(item));
      } else {
        // check current level
        ret = val.$ref ? ref(val) : val;
        Object.keys(ret).forEach(key => {
          // check each key;
          ret[key] = _example(ret[key]);
        })
        return ret;
      }
    } else {
      ret = val;
    }
    
    return ret;
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

  // drop tail index and method suffix
  const swaggerFile = relativePath.pop().split('--')[0];
  
  if (swaggerFile !== 'index.oas3' && swaggerFile !== 'index') {
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
      schema: swaggerJSON,
      showExample: true // only show schema example in schema html
    }
  };

  // get template & data by swagger type
  const _refMethod = ejsRef({ root, source: this.source_dir, src, dist, projName })
  const ejsTemplate = templateMap[swaggerType];
  const ejsData = Object.assign({
    srcStack: [data.path],
    ref: _refMethod,
    example: ejsExample(_refMethod),
    _: lodash
  }, dataMap[swaggerType])


  if (!ejsTemplate) return null;
  
  return new Promise(function(resolve, reject) {
    ejs.renderFile(ejsTemplate, ejsData, null, function(err, content) {  
      if (err) throw err
      let codeStart = false;

      // handle <nop> tag
      content = content
        .replace(/<\/nop>(\s*?)<nop>/g, '</nop>\n<nop>')
        .replace(/<nop>([\s\S]*?)<\/nop>/g, function(match, $1) {
          return $1.replace(/\r?\n/g, '')
        });

      // remove indent
      content = content.split(/\r?\n/).map(function(line) {
        if (line.indexOf('```') === 0) {
          codeStart = !codeStart;
        }

        if (codeStart) return line;
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