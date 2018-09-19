'use strict';

function swaggerConf(conf) {
  const config = conf.swagger;
  const src = config ? config.src : '_swagger';
  const dist = config ? config.dist : 'swagger';
  return { src, dist }
}

module.exports = swaggerConf;