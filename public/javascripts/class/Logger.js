define(function(require, exports, module) {
  util = require('../util');
  exports = module.exports = Logger;
  function Logger(email, password) {
    this.login = function(callback) {
      util.ajax({
        method: 'POST',
        url: '/login',
        callback: callback,
        data: {
          email: email,
          password: password
        }
      });
    };
    this.logout = function(callback) {
      var params = Array.prototype.slice.call(arguments, 1);
      util.ajax({
        method: 'GET',
        url: '/logout',
        callback: callback,
        returnType: 'JSON',
        data: {
          email: email
        }
      });
    };
  }
});