define(function(require, exports, module) {

  var $ = require('./zepto.js');
  
  function isType(type) {
    return function(obj) {
      return Object.prototype.toString.call(obj) === '[object ' + type + ']';
    }
  }

  exports.isObject = isType('Object');
  exports.isString = isType('String')
  exports.isArray = Array.isArray || isType('Array');
  exports.isFunction = isType('Function');

  /**
   * 只会找到第一个匹配index, 找不到返回-1
   */
  exports.findItem = function(container, target) {
    if (exports.isArray(container)) {
      for (var i = 0, len = container.length; i < len; i++) {
        var item = container[i];
        if (item === target) {
          return i;
        }
      }
      return -1;
    } else {
      throw new Error('Param 1 need to be Array.');
    }
  };
  /**
   * { "a": "b", "c": "d" } => a=b&c=d
   */
  exports.objToQuery = function(obj) {
    var result = '';
    for(var name in obj) {
      if (obj.hasOwnProperty(name)) {
        var part = encodeURIComponent(name) + '=' + encodeURIComponent(obj[name]) + '&';
        result += part;
      }
    }
    return result.substring(0, result.length - 1);
  };
  /**
   * AJAX请求
   */
  // options = {
  //   *method: {String} 'POST' | 'GET',
  //   *url: {String} url,
  //   data: {Object} data, (value类型需为String)
  //   form: {DOMElement} form, (method 为 POST 才可使用)
  //   *callback: {Function} callback,
  //   returnType: {String} 'JSON',
  //   onprogress: {Function} onprogress
  // }
  exports.ajax = function(options) {
    var xhr = new XMLHttpRequest();
    
    options.returnType = options.returnType || 'JSON';  //default return type is JSON
    xhr.upload.onprogress = options.onprogress || undefined;

    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
          if (options.returnType && options.returnType === 'TEXT') {
            options.callback(xhr.responseText);
          } else {
            options.callback(JSON.parse(xhr.responseText));
          }
        }
      }
    }
    
    getUrl = options.data ? options.url + '?' + exports.objToQuery(options.data) : options.url;
    postUrl = options.url;

    if (options.method === 'GET') {
      // console.log('== GET AJAX ==');
      // console.log(getUrl, options);
      xhr.open('GET', getUrl, true);
      xhr.send();
    } else if (options.method === 'POST') {
      xhr.open('POST', postUrl, true);
      if (options.form) {
        var formData = new FormData(options.form);
        xhr.send(formData);
      } else {
        if (options.data) {
          var formData = new FormData();
          for (var item in options.data) {
            if (options.data.hasOwnProperty(item)) {
              formData.append(item, options.data[item]);
            }
          }
          xhr.send(formData);
        } else {
          xhr.send();
        }
      }
    } else {
      throw new Error('ONLY SUPPORT POST | GET');
    }    
  };
  /**
   *  min-querySelector
   */
  exports.$ = function(selector) {
    return arguments[1] ? arguments[1].querySelector(selector) : document.querySelector(selector);
  };
  /**
   * min-querySelectorAll
   */
  exports.$$ = function(selector) {
    return arguments[1] ? arguments[1].querySelectorAll(selector) : document.querySelectorAll(selector);
  }
  /**
   * extend obj
   */
  exports.extend = function(target, appender) {
    for (var key in appender) {
      if (appender.hasOwnProperty(key)) {
        target[key] = target[key] || appender[key];
      }
    }
  }
  /**
   * convertTime
   */
  exports.convertTime = function(time) {
    var date = new Date(time);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
      week: date.getDay() //0-6
    };
  }
  /** 
   * convertDbArrayToTargetObj
   * @param {Array} dbDoc
   * @param {Function} constructor
   * @return {Array} result
   */
  exports.convertDbArrayToObjArray = function(dbArray, constructor) {
    var result = [];
    for (var i = 0, len = dbArray.length; i < len; i++) { 
      var item = dbArray[i];
      result.push(new constructor(item)); //IMP!
    }
    return result;
  }
  /**
   * 
   */
  exports.convertObjArrayToDbArray = function(objArray, converter) {
    var result = [];
    for (var i = 0, len = objArray.length; i < len; i++) {
      result.push(objArray[i][converter]()) ;
    }
  }
  /**
   *
   */
  exports.openMask = function(element, textElement, text) {
    $(element).addClass('open');
    if (textElement) {
      textElement.innerHTML = text;  
    }
    
  }
  exports.closeMask = function(element) {
    $(element).removeClass('open');
  }
  exports.openAlert = function(element, text) {
    element.querySelector('.alert').innerHTML = text;
    element.style.display = 'block';
  }
  exports.closeAlert = function(element) {
    element.style.display = 'none';
  }
  /**
   * HTML String to DOM [SMART!]
   * @return {Array}
   */
  exports.parseDom = function(htmlString) {
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    return tempDiv.childNodes;
  }
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
 * @ param {DOMElement} element
 */
  exports.show = function(element) {
    $(element).css({
      display: 'block'
    });
  }
  exports.hide = function(element) {
    $(element).css({
      display: 'none'
    });
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
});