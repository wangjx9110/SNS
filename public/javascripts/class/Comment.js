define(function(require, exports, module) {

  exports = module.exports = Comment;
  /**
   * options 
   * {
   *    from: {String} fromEmail
   *    to: {String} toEmail
   *    detail: {String} detail 
   * }
   */
  function Comment(options) { //Comment is read only
    this._from = options.from;
    this._to = options.to;
    this._detail = options.detail;
  }
  Comment.prototype.getFrom = function() {
    return this._from;
  }
  Comment.prototype.getTo = function() {
    return this._to;
  };
  Comment.prototype.getDetail = function() {
    return this._detail;
  };
  Comment.prototype.createDbDoc = function() {
    return {
      from: this.getFrom(),
      to: this.getTo(),
      detail: this.getDetail()
    };
  }
});
