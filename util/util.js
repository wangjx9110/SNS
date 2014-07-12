/**
 * @ param {String} tpl
 * @ param {Array}  replceOptions 
 * @ replceOptions format 
 * [ 
 *   { token: /\${test}/, value: 'test' }, 
 *   { token: 'testTpl', value: 'testValue'}, .. 
 * ]
 * @ return {String}
 */
exports.replaceTpl = function(tpl, replceOptions) {
  var tempTpl = tpl;
  for (var i = 0, len = replceOptions.length; i < len; i++) {
    var replaceItem = replceOptions[i];
    tempTpl = tempTpl.replace(replaceItem.token, replaceItem.value);
  }
  return tempTpl;
};

/**
 * @param {String} message
 * @return {String} 
 */
var crypto = require('crypto');
exports.md5 = function(message) {
  var md5 = crypto.createHash('md5');
  md5.update(message);
  return md5.digest('hex');
}
/**
 * @param {String} query
 * @return {Object}
 */
exports.queryToObj = function(query) {
  var queryItems = query.split('&');
  var result = {};
  for (var i = 0, len = queryItems.length; i < len; i++) {
    var item = queryItems[i];
    var keyValue = item.split('=');
    var key = keyValue[0];
    var value = keyValue[1];
    result[key] = value;
  }
  return result;
}
/**
 * @param {Object} obj
 * @param {Object} has
 * @return {Boolean}
 */
exports.findObjHas = function(obj, has) { //未验证
  for (var key in has) {
    if (has.hasOwnProperty(key)) {
      if (obj[key] !== has[key]) {
        return false;
      } 
    }
  }
  return true; 
}
/**
 * @param {Array} container
 * @param {Object} has
 * @return {Number} index | {Null}
 */
exports.findItemHas = function(container, has) {  //未验证
  for (var i = 0, len = container.length; i < len; i++) {
    var item = container[i];
    if (exports.findObjHas(item, has)) {  //item具备has所有要求
      return i;
    }
  }
  return -1;
}

exports.findItem = function(container, target) {
  for (var i = 0, len = container.length; i < len; i++) {
    var item = container[i];
    if (item === target) {
      return i;
    }
  }
  return -1;
}