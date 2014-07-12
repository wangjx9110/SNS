define(function(require, exports, module) {
  util = require('../util');
  exports = module.exports = Register;
  // options = {
  //   email: {String} email,
  //   nickname: {String} nickname,
  //   password: {String} password
  // }
  function Register(options) {
    
    this.doRegister = function(callback) {
      util.ajax({
        method: 'POST',
        url: '/register',
        callback: callback,
        returnType: 'JSON',
        data: {
          email: options.email,
          nickname: options.nickname,
          password: options.password
        }
      });
    };
  }
});