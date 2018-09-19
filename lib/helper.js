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

function linkName(path, baseUrl) {
  return path.replace(new RegExp(`^${baseUrl}/`), '').replace(/\/index$/, '');
}

function listPathsHelper() {
  const { dist } = swaggerConf(this.config);
  const projName = this.page.canonical_path.split('/')[1];

  // generate swagger components data & html
  const baseUrl = `^${projName}/paths`;
  const data = Object.keys(this.site.data).filter(key => {
    return new RegExp(baseUrl).test(key)
  }) || [];

  const html = data.map(function(path) {
    return `<li><a href="/${dist}/${path}.html">/${linkName(path, baseUrl)}</a></li>`;
  });

  return {
    data,
    html: `<ul>${html.join('')}</ul>`
  }
}

function listComponentsHelper(type) {
  const { dist } = swaggerConf(this.config);
  const projName = this.page.canonical_path.split('/')[1];

  // generate swagger components data & html
  const baseUrl = `^${projName}/components/${type}`;
  const data = Object.keys(this.site.data).filter(key => {
    return new RegExp(baseUrl).test(key)
  }) || []

  const html = data.map(function(path) {
    return `<li><a href="/${dist}/${path}.html">${linkName(path, baseUrl)}</a></li>`;
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