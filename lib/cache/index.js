var _ = require('lodash');
var fs = require('fs-extra');
var path = require('path');
var serialize = require('serialize-javascript');
var temp = require('temp');

temp.track();

function Cache(options) {
  this.options = options;
  this.modules = {};
  this.cachedModules = {};

  var log = fs.readJSONSync(path.join(options.output, 'miaow.log.json'), {throws: false}) || {};

  // 如果配置信息一致,就启用压缩缓存
  if (log.options === serialize(options)) {
    this.cachedModules = log.modules;
    this.temp = temp.mkdirSync('miaow');

    fs.copySync(options.output, this.temp);
  }

  fs.emptyDirSync(options.output);

  return this;
}

Cache.prototype.add = function (module) {
  this.modules[module.srcPath] = module;
};

Cache.prototype.get = function (srcPath, cb) {
  var module = this.modules[srcPath];

  return cb(null, module);
};

/**
 * 获取已经压缩后的内容
 *
 * @param {String} srcPath 源路径
 * @param {String} hash 用于判断是否需要使用缓存内容
 * @param cb
 */
Cache.prototype.getMinifiedContent = function (srcPath, hash, cb) {
  var module = this.cachedModules[srcPath];

  if (module && module.hash === hash) {
    fs.readFile(path.join(this.temp, module.destPath), cb);
  } else {
    cb();
  }
};

/**
 * 获取已经压缩后的内容
 *
 * @param {String} srcPath 源路径
 * @param {String} hash 用于判断是否需要使用缓存内容
 */
Cache.prototype.getMinifiedContentSync = function (srcPath, hash) {
  var module = this.cachedModules[srcPath];

  if (module && module.hash === hash) {
    fs.readFileSync(path.join(this.temp, module.destPath));
  } else {
    return;
  }
};

Cache.prototype.serialize = function (cb) {
  var modules = {};

  _.forEach(this.modules, function (module, srcPath) {
    modules[srcPath] = _.pick(module, ['srcPath', 'destPath', 'hash', 'url', 'dependencies']);
  });

  fs.writeJSON(
    path.join(this.options.output, 'miaow.log.json'),
    {
      options: serialize(this.options),
      modules: modules
    },
    cb);
};

module.exports = Cache;