'use strict';

const path = require('path');
const deepMerge = require('./deepMerge');

const getTsConfig = (filePath) => {
  const tsConfig = require(filePath);
  if (!tsConfig.extends) {
    return tsConfig;
  }
  const { extends: extendedFileRelativePath, ...configs } = tsConfig;
  const directory = path.dirname(filePath);
  const extendedFilePath = path.resolve(directory, extendedFileRelativePath);
  return deepMerge(getTsConfig(extendedFilePath), configs);
};

module.exports = getTsConfig;
