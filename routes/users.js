var express = require('express');
var router = express.Router();

//DB
var mongoClient = require(process.cwd() + '/mongo/mongoClient');
var mongoUrl = require(process.cwd() + '/mongo/mongoUtil').url;
//FORM
var path = require('path');
var formidable = require('formidable');
var fs = require('fs');
//UTIL
var util = require(process.cwd() + '/util/util');
var md5 = util.md5;
//URL
var url = require('url');
//SOCKET.IO
var io = require('../app').io;
var sockets = [];
var socketsCache = {};

io.on('connection', function(socket) {
  var referer = url.parse(socket.handshake.headers.referer, true);
  var email = referer.query.email;
  socket.SNS_TOKEN = email;
  for (var i = sockets.length - 1; i >= 0; i--) {
    var item = sockets[i];
    if (item.SNS_TOKEN === email) {
      sockets.splice(i, 1);
    }
  }

  sockets.push(socket);
  socket.on('online', function() {
    var socketCache = socketsCache[email];
    console.log('SOCKET CACHE', socketCache)
    if (socketCache && socketCache.length > 0) {
      for (var i = 0, len = socketCache.length; i < len; i++) {
        var item = socketCache[i];
        (function(_type, _data, _i) {
          setTimeout(function() {
            console.log('EMIT', _type, _data);
            socket.emit(_type, _data);
            socketCache.splice(_i, 1);
          }, 0);
        })(item.type, item.data, i);
      }
    }
  })
  console.log(email + ' connect');
  
  socket.on('disconnect', function() {
    console.log(email + ' disconnect');
    //离线移除SOCKET
    for (var i = sockets.length - 1; i >= 0; i--) {
      var item = sockets[i];
      if (item.SNS_TOKEN === email) {
        sockets.splice(i, 1);
      }
    }
  });
});

/* GET users listing. */
router.get('/', function(req, res) {
  var email = req.query.email;
  if (email != '' && email != undefined && email === req.signedCookies.email) { // null undefined | != | 0 false ''
    res.render('main', { title: email, email: email });
  } else {
    res.render('error', {
      message: '请通过正常途径登录',
      error: {
        status: 401
      }
    });    
  }
});

router.get('/userInfo', function(req, res) {
  var email = req.query.email;
  mongoClient.connect(mongoUrl, function(err, db) {
    var userInfo = db.collection('userInfo');
    var userFriends = db.collection('userFriends');
    var userBlogs = db.collection('userBlogs');
    var info = null;
    userInfo.findOne({ email: email }, function(err, result) {
      info = result;
      delete info.password;
      delete info._id;
      userFriends.findOne({ email: email }, function(err, result) {
        info.friends = (result && result.friends) || [];
        info.apply = (result && result.apply) || [];
        userBlogs.findOne({ email: email }, function(err, result) {
          info.blogs = (result && result.blogs) || [];
          res.send(JSON.stringify(info));          
        });
      });
    });
  });
})

router.get('/initInfo', function(req, res) {
  var email = req.query.email;
  mongoClient.connect(mongoUrl, function(err, db) {
    var userInfo = db.collection('userInfo');
    var userFriends = db.collection('userFriends');
    var infos = {
      friends: [],
      apply: []
    };
    userFriends.findOne({ email: email }, function(err, result) {
      if (result) {
        var friends = result.friends;
        var apply = result.apply;
        var ok_num = 0, target_num = friends.length + apply.length;
        if (ok_num === target_num) {
          res.send(JSON.stringify(infos));
          return;
        }
        
        for (var i = 0, len = friends.length; i < len; i++) {
          var item = friends[i];
          userInfo.findOne({ email: item }, function(err, friendInfoResult) {
            var friendInfo = {
              email: friendInfoResult.email,
              nickname: friendInfoResult.nickname,
              portrait: friendInfoResult.portrait,
              mood: friendInfoResult.mood
            };
            infos.friends.push(friendInfo);
            //同步检测
            ok_num++;
            if (ok_num === target_num) {  //start find apply
              res.send(JSON.stringify(infos));
            }
          });
        }
        for (var i = 0, len = apply.length; i < len; i++) {
          var item = apply[i];
          userInfo.findOne({ email: item }, function(err, applyInfoResult) {
            var applyInfo = {
              email: applyInfoResult.email,
              nickname: applyInfoResult.nickname,
              portrait: applyInfoResult.portrait,
              mood: applyInfoResult.mood
            };
            infos.apply.push(applyInfo);
            ok_num++;
            if (ok_num === target_num) {
              res.send(JSON.stringify(infos));
            }
          });
        }
      } else {
        res.send(JSON.stringify({ error: '找不到email对应的userFriends' })); 
      }
    });
  })
});

/* chat page data */
router.post('/chat', function(req, res) {
  //1.解析收到的信息, 判断toEmail是不是email的好友
  //2.触发事件
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    var fromEmail = fields.email;
    var toEmail = fields.toEmail;
    var message = fields.message;
    mongoClient.connect(mongoUrl, function(err, db) {
      var userFriends = db.collection('userFriends');
      userFriends.findOne({ email: fields.email }, function(err, result) {
        if (result) {
          if (util.findItem(result.friends, toEmail) > -1) {  //是好友
            var index = util.findItemHas(sockets, { SNS_TOKEN: toEmail });
            console.log(index,toEmail, message, fromEmail);
            if (index > -1) {
              var socket = sockets[index];
              socket.emit('new_message', { fromEmail: fromEmail, message: message });
            } else {
              //对方不在线, 找不到对应的SOCKET
              socketsCache[toEmail] = socketsCache[toEmail] || [];
              socketsCache[toEmail].push({
                type: 'new_message',
                data: { fromEmail: fromEmail, message: message }
              });
            }
            res.send(JSON.stringify({ success: true }));
          } else {
            res.send(JSON.stringify({ error: '不能给不是好友的人发信息。' }));
          }
        } else {
          res.send(JSON.stringify({ error: '找不到email对应的userFriends.' }));
        }
      })
    });
  });
});
/* friends page data */
router.post('/friends/confirm', function(req, res) {
  //1. 本方apply取出, 放入friend
  //2. 对方放入friend
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    mongoClient.connect(mongoUrl, function(err, db) {
      var userFriends = db.collection('userFriends');
      userFriends.findOne({ email: fields.email }, function(err, result) {
        if (result) {
          console.log('COMFIRM FRIEND!', 'FROM' + fields.email, 'TO' + fields.data);
          var index = util.findItem(result.apply, fields.data);
          if (index > -1) {
            result.apply.splice(index, 1);
            result.friends.push(fields.data);
            userFriends.update(
              { email: fields.email }, 
              { $set: { friends: result.friends, apply: result.apply }},
              { safe: true },
              function(err, result) {
                if (!err) {
                  userFriends.update(
                    { email: fields.data },
                    { $push: { friends: fields.email }},
                    { safe: true },
                    function() {
                      //触发发出申请的对象更新朋友列表
                      var index = util.findItemHas(sockets, { SNS_TOKEN: fields.data });
                      if (index > -1) {
                        var socket = sockets[index];
                        socket.emit('new_friend', { confirmEmail: fields.email });
                      } else {
                        //对方不在线, 找不到对应的SOCKET
                        socketsCache[fields.data] = socketsCache[fields.data] || [];
                        socketsCache[fields.data].push({
                          type: 'new_friend',
                          data: { confirmEmail: fields.email }
                        });
                      }
                      res.send(JSON.stringify({ success: true }));
                    }
                  );
                } else {
                  res.send(JSON.stringify({ error: err }));        
                }
              }
            );
          } else {
            res.send(JSON.stringify({ error: '找不到对应apply' }));
          }
        } else {
          res.send(JSON.stringify({ error: '找不到对应userFriend.' }));
        }
      });
    })
  })
});
router.post('/friends/ignore', function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    mongoClient.connect(mongoUrl, function(err, db) {
      var userFriends = db.collection('userFriends');
      userFriends.findOne({ email: fields.email }, function(err, result) {
        var apply = result.apply;
        var index = util.findItem(apply, fields.data);
        apply.splice(index, 1);
        userFriends.update({ email: fields.email }, { $set: { apply: apply } }, { safe: true }, function(err, result) {
          if (!err) {
            res.send(JSON.stringify({ success: true }));
          } else {
            res.send(JSON.stringify({ error: '数据库出错' }));
          }
        })
      });
    });
  });
});
router.post('/friends/delete', function(req, res) {
  var form =  new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    mongoClient.connect(mongoUrl, function(err, db) {
      var userFriends = db.collection('userFriends');
      //同时修改本人和对方的朋友列表删除对方, 修改完成后通知对方
      userFriends.findOne({ email: fields.email }, function(err, result) {
        if (result) {
          var friends = result.friends;
          var index = util.findItem(friends, fields.data);
          if (index > -1) {
            friends.splice(index, 1);
            userFriends.update({ email: fields.email }, { $set: { friends: friends } }, { safe: true }, function(err, result) {
              if (!err) {
                //对方删除此方
                userFriends.findOne({ email: fields.data }, function(err, result) {
                  if (result) {
                    var friends = result.friends;
                    var index = util.findItem(friends, fields.email);
                    if (index > -1) {
                      friends.splice(index, 1);
                      userFriends.update({ email: fields.data }, { $set: { friends: friends } }, { safe: true }, function(err, result) {
                        if (!err) {
                          //触发对方的删除事件
                          var index = util.findItemHas(sockets, { SNS_TOKEN: fields.data });
                          if (index > -1) {
                            var socket = sockets[index];
                            socket.emit('remove_friend', { removeEmail: fields.email });
                          } else {
                            //对方不在线, 找不到对应的SOCKET
                            socketsCache[fields.data] = socketsCache[fields.data] || [];
                            socketsCache[fields.data].push({
                              type: 'remove_friend',
                              data: { removeEmail: fields.email }
                            });
                          }
                          res.send(JSON.stringify({ success: true }));
                        } else {
                          res.send(JSON.stringify({ error: '数据库查询出错' })); 
                        }
                      });
                    } else {
                      res.send(JSON.stringify({ error: '对方朋友列表中找不到当前email' }));
                    }
                  } else {
                    res.send(JSON.stringify({ error: '数据库找不到对方数据' }));
                  }
                })
              } else {
                res.send(JSON.stringify({ error: '数据库查询出错' }));
              }
            });
          } else {
            res.send(JSON.stringify({ error: '本方朋友列表中找不到对方email' }));
          }
        } else {
          res.send(JSON.stringify({ error: '数据库找不到本方数据' }));
        }
      })
    })
  });
});
/* search page data */
router.get('/search/info', function(req, res) {
  if (req.query.data) {
    if (req.query.email === req.query.data) {
      res.send(JSON.stringify({ error: '不要自己查自己好吗?' }));
      return;
    }
    mongoClient.connect(mongoUrl, function(err, db) {
      var userInfo = db.collection('userInfo');
      console.log('QUERY DATA', req.query.data);
      userInfo.find({ email: req.query.data }).toArray(function(err, result) {
        var resultContainer = [];
        for (var i = 0, len = result.length; i < len; i++) {
          var item = result[i];
          var itemContainer = {
            email: item.email,
            nickname: item.nickname,
            portrait: item.portrait
          };
          resultContainer.push(itemContainer);
        }
        console.log('INFO ARRAY: ', resultContainer);
        res.send(JSON.stringify({ success: true, info: resultContainer }));
      });
    });
  } else {
    res.send(JSON.stringify({ error: 'No email received.' }));
  }
});
router.post('/search/requestFriend', function(req, res) { //修改对方apply, 并通知对方
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    mongoClient.connect(mongoUrl, function(err, db) {
      var userFriends = db.collection('userFriends');
      userFriends.findOne({ email: fields.email }, function(err, result) { //判断在不在自己的好友列表或申请列表中
        if (result) {
          var indexInEmailFriends = util.findItem(result.friends, fields.data);
          var indexInEmailApply = util.findItem(result.apply, fields.data);
          console.log('---------', indexInEmailFriends, indexInEmailApply, result, fields.data);
          if (indexInEmailFriends === -1 && indexInEmailApply === -1) {
            userFriends.findOne({ email: fields.data }, function(err, result) {
              if (result) {
                console.log('REQUEST FRIEND!', 'FROM' + fields.email, 'TO' + fields.data);
                var index = util.findItem(result.apply, fields.email);  //申请列表中必须没有才能申请
                var indexInFriends = util.findItem(result.friends, fields.email);
                console.log(result.apply, fields.email, index);
                if (index === -1 && indexInFriends === -1) { //没有才进行插入
                  userFriends.update({ email: fields.data }, { $push: { apply: fields.email }}, { safe: true }, function(err) {
                    if (!err) {
                      //触发申请的对象更新申请列表
                      var index = util.findItemHas(sockets, { SNS_TOKEN: fields.data });
                      if (index > -1) {
                        var socket = sockets[index];
                        socket.emit('new_apply', { applyEmail: fields.email });
                      } else {
                        //对方不在线, 找不到对应的SOCKET
                        socketsCache[fields.data] = socketsCache[fields.data] || [];
                        socketsCache[fields.data].push({
                          type: 'new_apply',
                          data: { applyEmail: fields.email }
                        });
                      }
                      res.send(JSON.stringify({ success: true }));
                    } else {
                      res.send(JSON.stringify({ error: err }));
                    }
                  });
                } else {
                  res.send(JSON.stringify({ error: '此用户已经是是您的好友或您已经申请过.' }));
                }
              } else {
                res.send(JSON.stringify({ error: '找不到对应userFriend.' }));
              }
            });
          } else {
            res.send(JSON.stringify({ error: '此用户已经是是您的好友或该用户已经向您发出申请(申请列表中确认即可).' }));
          }
        } else {
          res.send(JSON.stringify({ error: '找不到对应userFriend.' }));
        }
      });
    })
  });
});
/* status page data */
router.get('/blogs/blogList', function(req, res) {
  var email = req.query.email;
  if (email) {
    mongoClient.connect(mongoUrl, function(err, db) {
      var userBlogs = db.collection('userBlogs');
      var userFriends = db.collection('userFriends');
      var blogProcessor = [];
      userFriends.findOne({ email: email }, function(err, result) {
        if (!err) {
          var friends = result.friends;
          friends.push(email);  //包括自己
          var ready_num = 0, target_num = friends.length;
          for (var i = 0, len = friends.length; i < len; i++) {
            var friend = friends[i];
            userBlogs.findOne({ email: friend }, function(err, result) {
              blogProcessor.push(result);
              ready_num++;
              if (ready_num === target_num) {
                //开始对数据进行处理
                var result = [];
                for (var i = 0, len = blogProcessor.length; i < len; i++) {
                  var item = blogProcessor[i];
                  for (var j = 0, jLen = item.blogs.length; j < jLen; j++) {
                    // var jItem = item.blogs[j];
                    // var index = util.findItem(jItem.favours, email);
                    // if (index > -1) { //该用户已赞
                    //   jItem.isFavour = true;
                    // } else {  //该用户微赞
                    //   jItem.isFavour = false;
                    // }
                    result.push(item.blogs[j]);
                  }
                }
                result.sort(function(obj1, obj2) {
                  if (obj1.time > obj2.time) {
                    return -1;
                  } else {
                    return 1;
                  }
                });
                res.send(JSON.stringify({ success: true, data: result }));                
              }
            });
          }
        } else {
          res.send(JSON.stringify({ error: '数据库出错.' }));
        }
      });
      userBlogs.findOne({ email: req.query.email }, function(err, result) {
      });
    });
  } else {
    res.send(JSON.stringify({ error: 'No email received.' }));
  }
});
router.post('/blogs/addBlog', function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    fields.data = JSON.parse(fields.data);
    console.log(fields);
    mongoClient.connect(mongoUrl, function(err, db) {
      var userBlogs = db.collection('userBlogs');
      var userFriends = db.collection('userFriends');
      userBlogs.update({ email: fields.email }, { $push: { blogs: fields.data }}, { safe: true}, function(err) {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        } else {
          userFriends.findOne({ email: fields.email }, function(err, result) {  //通知所有朋友
            var friends = result.friends;
            for (var i = 0, len = friends.length; i < len; i++) { //遍历朋友
              var item = friends[i];
              var index = util.findItemHas(sockets, { SNS_TOKEN: item });
              if (index > -1) {
                var socket = sockets[index];
                socket.emit('new_blog', {});
              } else {
                //对方不在线, 找不到对应的SOCKET
                socketsCache[fields.data] = socketsCache[fields.data] || [];
                socketsCache[fields.data].push({
                  type: 'new_blog',
                  data: {}
                });
              }
            }
            res.send(JSON.stringify({ success: true }));
          })
        }
      })
    })
  });
});
router.post('/blogs/removeBlog', function(req, res) { //没写呢！！
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {

  });
});
router.post('/blogs/addFavour', function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    var email = fields.email;
    var timeStamp = parseInt(fields.timeStamp, 10);
    var targetEmail = fields.targetEmail;
    mongoClient.connect(mongoUrl, function(err, db) {
      var userBlogs = db.collection('userBlogs');
      var userFriends = db.collection('userFriends');
      userBlogs.findOne({ email: targetEmail }, function(err, result) {
        if (result) {
          var blogs = result.blogs;
          for (var i = 0, len= blogs.length; i < len; i++) {
            var item = blogs[i];
            if (item.time === timeStamp) { //找到对应BLOG, 看里面有没有Favour
              var index = util.findItem(item.favours, email);
              if (index > -1) {
                res.send(JSON.stringify({ success: true }));
                return;
              } else {
                item.favours.push(email); //添加FAVOUR
                userBlogs.update({ email: targetEmail }, { $set: { blogs: blogs } }, { safe: true }, function(err, result) {
                  if (!err) { //添加并通知通知所有好友new_favour
                    userFriends.findOne({ email: targetEmail }, function(err, result) {  //通知所有朋友
                      var friends = result.friends;
                      //状态发布者也加入
                      friends.push(targetEmail);
                      //找到点赞者, 并删除
                      friends.splice(util.findItem(friends, email), 1);
                      for (var i = 0, len = friends.length; i < len; i++) { //遍历朋友
                        var item = friends[i];
                        console.log(item);
                        var index = util.findItemHas(sockets, { SNS_TOKEN: item });
                        if (index > -1) {
                          var socket = sockets[index];
                          socket.emit('new_favour', {});
                        } else {
                          //对方不在线, 找不到对应的SOCKET
                          socketsCache[fields.data] = socketsCache[fields.data] || [];
                          socketsCache[fields.data].push({
                            type: 'new_favour',
                            data: {}
                          });
                        }
                      }
                      res.send(JSON.stringify({ success: true }));
                    })
                  }
                });
              }
              break;
            }
          }
        } else {
          res.send(JSON.stringify({ error: '找不到对应userBlogs' }));
        }
      })
    })
  })
});
router.post('/blogs/removeFavour', function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    var email = fields.email;
    var timeStamp = parseInt(fields.timeStamp, 10);
    var targetEmail = fields.targetEmail;
    mongoClient.connect(mongoUrl, function(err, db) {
      var userBlogs = db.collection('userBlogs');
      var userFriends = db.collection('userFriends');
      userBlogs.findOne({ email: targetEmail }, function(err, result) {
        if (result) {
          var blogs = result.blogs;
          for (var i = 0, len= blogs.length; i < len; i++) {
            var item = blogs[i];
            if (item.time === timeStamp) { //找到对应BLOG, 看里面有没有Favour
              var index = util.findItem(item.favours, email);
              if (index > -1) {
                item.favours.splice(index, 1);
                userBlogs.update({ email: targetEmail }, { $set: { blogs: blogs } }, { safe: true }, function(err, result) {
                  if (!err) {
                    userFriends.findOne({ email: targetEmail }, function(err, result) {  //通知所有朋友
                      var friends = result.friends;
                      //状态发布者也加入
                      friends.push(targetEmail);
                      //找到点赞者, 并删除
                      friends.splice(util.findItem(friends, email), 1);
                      for (var i = 0, len = friends.length; i < len; i++) { //遍历朋友
                        var item = friends[i];
                        var index = util.findItemHas(sockets, { SNS_TOKEN: item });
                        if (index > -1) {
                          var socket = sockets[index];
                          socket.emit('remove_favour', {});
                        } else {
                          //对方不在线, 找不到对应的SOCKET
                          socketsCache[fields.data] = socketsCache[fields.data] || [];
                          socketsCache[fields.data].push({
                            type: 'remove_favour',
                            data: {}
                          });
                        }
                      }
                      res.send(JSON.stringify({ success: true }));
                    });
                  }
                });
              } else {
                res.send(JSON.stringify({ success: true }));
                return;
              }
              break;
            }
          }
        } else {
          res.send(JSON.stringify({ error: '找不到对应userBlogs' }));
        }
      })
    })
  })
});
/* setting page data */
router.post('/settings/nickname', function(req, res) {
  console.log('BACK NICKNAME');
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    mongoClient.connect(mongoUrl, function(err, db) {
      var userInfo = db.collection('userInfo');
      userInfo.update({ email: fields.email }, { $set: { nickname: fields.data } }, { safe: true }, function(err) {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        } else {
          res.send(JSON.stringify({ success: true }));
        }
      })
    });
  });
});
router.post('/settings/password', function(req, res) {
  console.log('BACK PASSWORD');
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    mongoClient.connect(mongoUrl, function(err, db) {
      var userInfo = db.collection('userInfo');
      console.log(fields.data);
      console.log(typeof fields.data);
      console.log(md5(fields.data));
      console.log(md5('123'));
      userInfo.update({ email: fields.email }, { $set: { password: md5(fields.data + fields.email) } }, { safe: true }, function(err) {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        } else {
          res.send(JSON.stringify({ success: true }));
        }
      })
    });
  });
});
router.post('/settings/mood', function(req, res) {
  console.log('BACK MOOD');
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    mongoClient.connect(mongoUrl, function(err, db) {
      var userInfo = db.collection('userInfo');
      userInfo.update({ email: fields.email }, { $set: { mood: fields.data } }, { safe: true }, function(err) {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        } else {
          res.send(JSON.stringify({ success: true }));
        }
      })
    });
  });
});
router.post('/settings/portrait', function(req, res) {
  console.log('BACK PORTRAIT');
  var form = new formidable.IncomingForm();
  form.uploadDir = path.join(process.cwd(), 'public/images/upload');
  form.keepExtensions = true;
  form.parse(req, function(err, fields, files) {
    if (files.data) {
      console.log(fields);
      console.log(files.data);
      mongoClient.connect(mongoUrl, function(err, db) {
        var userInfo = db.collection('userInfo');
        console.log(files.data.path);
        console.log(files.data.path.replace(process.cwd(), ''));
        console.log(files.data.path.replace(process.cwd(), '').replace(/\\/g, '/'));
        console.log(files.data.path.replace(process.cwd(), '').replace(/\\/g, '/').replace('/public/', ''));
        var fixedPath = files.data.path.replace(process.cwd(), '').replace(/\\/g, '/').replace('/public/', '');
        console.log('=== FIX PATH ===');
        console.log(fixedPath);
        userInfo.update({ email: fields.email }, { $set: { portrait: fixedPath } }, { safe: true }, function(err) {
          if (err) {
            res.send(JSON.stringify({ error: err }));
          } else {
            res.send(JSON.stringify({ success: true, filePath: fixedPath }));
          }
        })
      });      
    } else {
      console.log('NO FILES!');
    }

  });
});

module.exports = router;
