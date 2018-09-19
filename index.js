'use strict';
/* global hexo */

const { oas3Renderer } = require('./lib/renderer');
const { oas3FileProcessor, oas3DataProcessor} = require('./lib/processor');
const { listPathsHelper, listComponentsHelper } = require('./lib/helper');

hexo.extend.renderer.register('oas3', 'html', oas3Renderer, true);
hexo.extend.processor.register('*path.oas3', oas3FileProcessor(hexo));
hexo.extend.processor.register('*path.oas3', oas3DataProcessor(hexo));
hexo.extend.helper.register('swagger_list_paths', listPathsHelper);
hexo.extend.helper.register('swagger_list_components', listComponentsHelper);