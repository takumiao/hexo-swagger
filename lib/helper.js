'use strict';

const fs = require('fs');
const glob = require('glob');
const _ = require('lodash');
const swaggerConf = require('./conf');

function generatePaths(swagger, path, value) {
  swagger.paths = swagger.paths || {};
  swagger.paths['/' + path.join('/')] = value;
}

function generateComponents(swagger, path, value) {
  swagger.components = swagger.components || {};
  const type = path[0];
  if (type === 'schemas' || type === 'requestBodies') {
    swagger.components[type] = swagger.components[type] || {};
    swagger.components[type][path[1]] = value;
  } else {
    swagger.components[type] = value
  }
}

// drop tail index
function dropTailIndex(path) {
  return path.replace(/\/index$/, '')
}

function linkName(path, baseUrl) {
  return dropTailIndex(path.replace(new RegExp(`^${baseUrl}/`), ''));
}

function urlName(path, baseUrl) {
  path = path.split('--');
  const method = path[1] || 'get';
  const url = linkName(path[0], baseUrl);
  return `<span class="http-method">[${method.toUpperCase()}]</span> /${url}`;
}

function listPathsHelper() {
  const { root } = this.config;
  const { dist } = swaggerConf(this.config);
  const projName = this.page.canonical_path.split('/')[1];

  // generate swagger components data & html
  const baseUrl = `^${projName}/paths`;
  const swagger = this.site.data[`${projName}/index`];
  const data = Object.keys(this.site.data).filter(key => {
    return new RegExp(baseUrl).test(key)
  }) || [];

  let tagGroup = {
    '__no_group_': []
  };

  if (Array.isArray(swagger.tags)) {
    swagger.tags.forEach(function(tag) {
      tagGroup[tag.name] = [];
    });
  }

  data.forEach(function(path) {
    console.log(path);
    if (Array.isArray(path.tags)) {
      paths.tags.forEach(function(name) {
        !tagGroup[name] || (tagGroup[name] = []);
        tagGroup[name].push(path);
      })
    }
  });

  Object.keys(tagGroup).forEach(function(name) {
    tagGroup[name].sort(function(a, b) { 
      return dropTailIndex(a) > dropTailIndex(b) ? 1 : -1;
    })
  });

  console.log(tagGroup);

  const html = data.map(function(path) {
    return `<li><a href="${root}${dist}/${path}.html">${urlName(path, baseUrl)}</a></li>`;
  });

  return {
    data,
    html: `<ul>${html.join('')}</ul>`
  }
}

function listComponentsHelper(type) {
  const { root } = this.config;
  const { dist } = swaggerConf(this.config);
  const projName = this.page.canonical_path.split('/')[1];

  // generate swagger components data & html
  const baseUrl = `^${projName}/components/${type}`;
  const data = Object.keys(this.site.data).filter(key => {
    return new RegExp(baseUrl).test(key)
  }) || []

  data.sort();

  const html = data.map(function(path) {
    return `<li><a href="${root}${dist}/${path}.html">${linkName(path, baseUrl)}</a></li>`;
  });

  return {
    data,
    html: `<ul>${html.join('')}</ul>`
  }
}

module.exports = {
  listPathsHelper,
  listComponentsHelper
}