define(function(require, exports, module) {
  var Comment = require('./Comment');
  var util = require('../util');

  exports = module.exports = Blog;
  /**
   * options 
   * {
   *    time: {String} time (unformated)
   *    detail: {String} detail
   *    comments: {Array} commentArray
   *    favour: {Array} emailArray 
   * }
   */
  function Blog(options) {
    this._email = options.email;

    this._time = options.time || +new Date();
    this._detail = options.detail;
    this._comments = util.convertDbArrayToObjArray(options.comments || [], Comment);
    this._favours = options.favours || [];
  }
  Blog.prototype.getEmail = function() {
    return this._email;
  }
  Blog.prototype.getTime = function() {
    return this._time;
  }
  Blog.prototype.getDetail = function() {
    return this._detail;
  }
  Blog.prototype.getComments = function() {
    return this._comments;
  }
  Blog.prototype.removeComment = function(publisher, comment, callback) {  //只能删除自己发表的评论
    if (publisher.getEmail() !== comment.getFrom()) {
      throw new Error('Only publisher can remove it\'s comment');
    }
    if (comment.constructor === Comment) {
      var index = util.findItem(this.getComments(), comment);
      if (index > -1) {
        util.ajax({
          method: 'POST',
          url: '/blogs/removeComment',
          data: {
            email: this.getEmail(),
            data: JSON.stringify(comment.createDbDoc())
          },
          returnType: 'JSON',
          callback: function(data) {
            if (data.success) {
              this.getComments().splice(index, 1);
              callback && callback(data);
            } else {
              throw data.error;
            }
          }
        });
      } else {
        throw new Error('Can not find given comment');
      }
    } else {
      throw new Error('Invalid comment');
    }
  }
  Blog.prototype.addComment = function(comment, callback) {
    if (comment.constructor === Comment) {
      util.ajax({
        method: 'POST',
        url: '/blogs/addComment',
        data: {
          email: this.getEmail(),
          data: JSON.stringify(comment.createDbDoc())
        },
        returnType: 'JSON',
        callback: function(data) {
          if (data.success) {
            this.getComments().push(comment);
            callback && callback(data);
          } else {
            throw data.error;
          }
        }
      });
    } else {
      throw new Error('Invalid comment');
    }
  }
  Blog.prototype.getFavours = function() {
    return this._favours;
  }
  Blog.prototype.toggleFavour = function(publisher, email, callback) {  //注意..此种情况是可以随意访问接口进行删除增加的
    if (publisher.getEmail() !== email) {
      throw new Error('Only publisher can operate it\'s favour');
    }
    if (util.isString(email)) {
      var index = util.findItem(this.getFavours(), email);
      var ajaxObj = {
        method: 'POST',
        url: null,
        data: {
          email: email
        }
      };
      if (index > -1) { //已存在, 执行删除
        ajaxObj.url = '/blogs/removeFavour';
        ajaxObj.callback = function(data) {
          if (data.success) {
            this.getFavours().splice(index, 1);
            callback(data);
          } else {
            throw data.error;
          }
        };
      } else {  //不存在, 执行添加
        ajaxObj.url = '/blogs/addFavour';
        ajaxObj.callback = function(data) {
          if (data.success) {
            this.getFavours().push(email);
            callback(data);
          } else {
            throw data.error;
          }
        };
      }
      util.ajax(ajaxObj);
    } else {
      throw new Error('Invalid email');
    }
  }
  Blog.prototype.createDbDoc = function() {
    return {
      email: this.getEmail(),
      time: this.getTime(),
      detail: this.getDetail(),
      comments: util.convertObjArrayToDbArray(this.getComments(), 'createDbDoc'),
      favours: this.getFavours()
    };
  }
});