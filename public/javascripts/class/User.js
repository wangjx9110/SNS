define(function(require, exports, module) {
  
  var util = require('../util');
  var Blog = require('./Blog');
  var Friend = require('./Friend');

  exports = module.exports = User;
  
  function User(info) {
    
    var self = this;

    // -- info include --
    // // 自身
    // var email = '';
    // var nickname = '';
    // var mood = '';
    // var portrait = '';
    // //组合
    // var blogs = [];
    // var friends = [];

    this.channel = 'chat';

    this.getInfo = function(attr) {
      return info[attr];
    }

    this.setInfo = function(attr, value, callback) {  //针对 nickname, mood & portrait 的数据更新
      util.ajax({
        method: 'POST',
        url: '/users/settings/' + attr,
        data: {
          email: info.email,
          value: value
        },
        returnType: 'JSON',
        callback: function(data) {
          if (data.success) {
            info[attr] = data.filePath || value;
            console.log('SET INFO', attr, value);
          } else {
            console.log(data.error);
          }
          callback(data);
        }
      });
    }

    this.Channel = {
      onChangeChannel: function() {
        //占位, 会被外部替换掉
      },
      setChannel: function(channelName) {
        self.channel = channelName;
        this.onChangeChannel(self.channel);
      }
    };

    this.blogs = {
      getBlogList: function() {

      },
      addBlog: function(blog) {
        if (blog.constructor === Blog) {

          blogs.push(blog);
        } else {
          throw new Error('The param type need to be Blog');
        }
      },
      removeBlog: function(blog) {
        if (blog.constructor === Blog) {
          if (util.findItem(blogs, blog) >= 0) {
            blogs.splice(index, 1);
          }
        } else {
          throw new Error('The param type need to be Blog');
        }
      }
    };

    this.friends = {
      getFriendsList: function() {

      },
      confirmFriend: function() {

      },
      removeFriend: function() {

      }
    };

    this.search = {
      getRequestList: function() {  //申请列表

      },
      findFriend: function() {

      },
      requestFriend: function() {

      }
    };

    this.chat = {
      getRecentChatList: function() {

      },
      sendMessage: function() {

      },
      onMessage: function() {

      }
    };

    this.setting = {
      updateSetting: function() {

      }
    };

  }

});
