define(function(require, exports, module) {
  var util = require('../util');
  var Blog = require('./Blog');
  var Comment = require('./Comment');
//  var Friend = require('./Friend');

  exports = module.exports = User;

  var SETTING_PATH = '/users/settings/';

  function User(options) {
    this._email = options.email;
    this._nickname = options.nickname || '';
    this._mood = options.mood || '';
    this._portrait = options.portrait || '';
    // no password for safe
    this._blogs = util.convertDbArrayToObjArray(options.blogs || [], Blog);
//    this._friends = util.convertDbArrayToObjArray(options.friends || [], Friend);
    this._friends = options.friends || [];
    this._apply = options.apply || []; 

    this._channel = options.channel || 'chat'; 
    // 'CHAT' | 'FRIENDS' | 'SEARCH' | 'BLOGS' | 'SETTING'

    this.chatCache = {};
  }
  User.prototype.getAttr = function(attr) {
    attr = '_' + attr;
    return this[attr];
  }
  User.prototype.setNickname = function(nickname, callback) {
    var self = this;
    util.ajax({
      method: 'POST',
      url: SETTING_PATH + 'nickname',
      data: {
        email: this.getAttr('email'),
        data: nickname
      },
      callback: function(data) {
        if (data.success) {
          self._nickname = nickname;
          callback(data);
        } else {
          throw data.error;
        }
      }
    });
  }
  User.prototype.setMood = function(mood, callback) {
    var self = this;
    util.ajax({
      method: 'POST',
      url: SETTING_PATH + 'mood',
      data: {
        email: this.getAttr('email'),
        data: mood
      },
      callback: function(data) {
        if (data.success) {
          self._mood = mood;
          callback(data);
        } else {
          throw data.error;
        }
      }
    });
  }
  User.prototype.setPortrait = function(portraitFile, callback) {
    var self = this;
    util.ajax({
      method: 'POST',
      url: SETTING_PATH + 'portrait',
      data: {
        email: this.getAttr('email'),
        data: portraitFile
      },
      callback: function(data) {
        if (data.success) {
          self._portrait = data.filePath;
          callback(data);
        } else {
          throw data.error;
        }
      }
    });
  }
  User.prototype.setPassword = function(password, callback) {
    var self = this;
    util.ajax({
      method: 'POST',
      url: SETTING_PATH + 'password',
      data: {
        email: this.getAttr('email'),
        data: password
      },
      callback: function(data) {
        if (data.success) {
          callback(data);
        } else {
          throw data.error;
        }
      }
    });
  }

  User.prototype.addApply = function(email) {
    this._apply.push(email);
  }
  User.prototype.removeApply = function(email) {
    var index = util.findItem(this.getAttr('apply'), email);
    if (index > -1) {
      this._apply.splice(index, 1);
    }
  }
  User.prototype.addFriend = function(email) {
    this._friends.push(email);
  }
  User.prototype.removeFriend = function(email) {
    var index  = util.findItem(this.getAttr('friends'), email);
    if (index > -1) {
      this._friends.splice(index, 1);
    }
  }
  //CHANNEL
  User.prototype.setChannel = function(channelName) {
    this._channel = channelName;
    this.onChannelChange(this.getAttr('channel'));
  }
  User.prototype.onChannelChange = function() {
    //占位, 会被外部替换掉
  }

  //EXTEND PROTO
  util.extend(User.prototype, {
    //CHAT
    chat_sendMessage: function(toEmail, message, callback) {
      var self = this;
      util.ajax({
        method: 'POST',
        url: '/users/chat',
        data: {
          email: self.getAttr('email'),
          toEmail: toEmail,
          message: message
        },
        callback: function(data) {
          if (data.success) {
            
            var chatObj = {
              fromSelf: true,
              message: message
            };
            //self.chatCache[toEmail] = self.chatCache[toEmail] || [];
            //注释理由同onMessage
            self.chatCache[toEmail].push(chatObj);
            self.chatCache[toEmail].recentTime = +new Date(); //更新时间
            callback();
          } else {
            throw data.error;
          }
        }
      });
    },
    chat_onMessage: function(fromEmail, message, handler) {
      
      var chatObj = {
        fromSelf: false,
        message: message
      };
      //this.chatCache[fromEmail] = this.chatCache[fromEmail] || [];
      //之前已经保证chatCache[fromEmail]存在了, 每次refreshFriendsList会更新chatCache
      //更新friendsList的情况: 1.初始化. 2.确认好友 3.删除好友 4.收到添加朋友的信息 5.收到删除朋友的信息
      this.chatCache[fromEmail].push(chatObj);
      this.chatCache[fromEmail].recentTime = +new Date(); //更新时间
      handler && handler();
    },
    //FRIENDS
    friends_getFriendsList: function() {
      return this.getAttr('friends');
    },
    friends_onRequest: function(applyEmail, handler) {
      this.addApply(applyEmail);
      alert('NEW APPLY!');
      handler();
    },
    friends_onConfirm: function(confirmEmail, handler) {
      this.addFriend(confirmEmail);
      console.log('A FRIEND ' + confirmEmail + ' APPLY WAS CONFIRMED');
      handler();
    },
    friends_onRemove: function(removeEmail, handler) {
      this.removeFriend(removeEmail);
      console.log('FRIEND' + removeEmail + 'WAS REMOVED');
      handler();
    },
    friends_confirmFriend: function(confirmEmail,callback) { 
      var self = this;
      util.ajax({
        method: 'POST',
        url: '/users/friends/confirm',
        data: {
          email: self.getAttr('email'),
          data: confirmEmail
        },
        callback: function(data) {  //后端须通知, confirm推送, 移除email apply中的confirm
          if (data.success) {
            self.removeApply(confirmEmail);
            self.addFriend(confirmEmail);
            callback(data);
          } else {
            throw data.error;
          }
        }
      });
    },
    friends_removeFriend: function(removeEmail, callback) {
      var self = this;
      util.ajax({
        method: 'POST',
        url: '/users/friends/delete',
        data: {
          email: self.getAttr('email'),
          data: removeEmail
        },
        callback: function(data) {  //后端须通知, delete推送, 移除要删除friends中对应的email
          if (data.success) {
            self.removeFriend(removeEmail);
            callback();
          } else {
            throw data.error;
          }
        }
      });
    },
    friends_ignoreFriend: function(ignoreEmail, callback) {
      var self = this;
      util.ajax({
        method: 'POST',
        url: '/users/friends/ignore',
        data: {
          email: self.getAttr('email'),
          data: ignoreEmail
        },
        callback: function(data) {
          self.removeApply(ignoreEmail);
          callback(data);
        }
      });
    },
    //SEARCH
    search_getRequestList: function() {
      return this.getAttr('apply');
    },
    search_findFriend: function(findEmail, callback) {
      var self = this;
      util.ajax({
        method: 'GET',
        url: '/users/search/info',
        data: {
          email: self.getAttr('email'),
          data: findEmail
        },
        callback: function(data) {
          if (data.success) {
            callback(data);
          } else {
            throw data.error;
          }
        }
      });
    },
    search_requestFriend: function(requestEmail, callback) {  //注意, 任何人调用这个链接都可以冒充, 需后端做验证
      var self = this;
      util.ajax({
        method: 'POST',
        url: '/users/search/requestFriend',
        data: {
          email: self.getAttr('email'),
          data: requestEmail
        },
        callback: callback
      });
    },
    //BLOG
    blogs_getBlogsList: function(callback) {
      // var blogs = this.getAttr('blogs');
      // var result = [];
      // for (var i = 0, len = blogs.length; i < len; i++) {
      //   result.push(blogs[i]);
      // }
      // return result;
      var self = this;
      util.ajax({
        method: 'GET',
        url: '/users/blogs/blogList',
        data: {
          email: self.getAttr('email')
        },
        callback: function(data) {
          if (data.success) {
            callback(data);
          } else {
            throw data.error;
          }
        }
      });
    },
    blogs_addBlog: function(blog, callback) {
      var self = this;
      util.ajax({
        method: 'POST',
        url: '/users/blogs/addBlog',
        data: {
          email: self.getAttr('email'),
          data: JSON.stringify(blog.createDbDoc())
        },
        callback: function(data) {
          if (data.success) {
            self.getAttr('blogs').push(blog);
            callback(data);
          } else {
            throw data.error;
          }
        }
      })
    },
    blogs_removeBlog: function(blog, callback) {
      var self = this;
      util.ajax({
        method: 'POST',
        url: 'users/blogs/removeBlog',
        data: {
          email: self.getAttr('email'),
          data: JSON.stringify(blog.createDbDoc())
        },
        callback: function(data) {
          if (data.success) {
            util.findItem(self.getAttr('blogs'), blog);
            callback(data);
          } else {
            throw data.error;
          }
        }
      });
    },
    blogs_addFavour: function(targetEmail, timeStamp, callback) {
      var self = this;
      util.ajax({
        method: 'POST',
        url: 'users/blogs/addFavour',
        data: {
          email: self.getAttr('email'),
          timeStamp: timeStamp,
          targetEmail: targetEmail
        },
        callback: function(data) {
          if (data.success) {
            callback();
          } else {
            throw data.error;
          }
        }
      });
    },
    blogs_removeFavour: function(targetEmail, timeStamp, callback) {
      var self = this;
      util.ajax({
        method: 'POST',
        url: 'users/blogs/removeFavour',
        data: {
          email: self.getAttr('email'),
          timeStamp: timeStamp,
          targetEmail: targetEmail
        },
        callback: function(data) {
          if (data.success) {
            callback();
          } else {
            throw data.error;
          }
        }
      });
    }
  });
});