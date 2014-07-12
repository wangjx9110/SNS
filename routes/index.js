var express = require('express');
var router = express.Router();
//FORM
var path = require('path');
var formidable = require('formidable');

var fs = require('fs');
//DB
var mongoClient = require(process.cwd() + '/mongo/mongoClient');
var mongoUrl = require(process.cwd() + '/mongo/mongoUtil').url;
//UTIL
var util = require(process.cwd() + '/util/util');
var md5 = util.md5;

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'iTalk!' });
});

/* upload router */
router.post('/upload', function(req, res) {
  var form = new formidable.IncomingForm();
  form.uploadDir = path.join(process.cwd(), 'public/images/upload');
  form.keepExtensions = true;
  form.parse(req, function(err, fields, files) {
    console.log(fields);
    console.log(files.portrait.path);
    res.send('Hello World!');
  });
});

/* login router */
router.post('/login', function(req, res) {
  //1. 连接数据库
  //2. 查询对应邮箱document
  //3. 校验密码正确性 正确 -> 登录, 错误 -> 提示
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    var reqData = fields;
    mongoClient.connect(mongoUrl, function(err, db) {
      var userInfo = db.collection('userInfo');
      userInfo.find({ email: reqData.email }).toArray(function(err, result) {
        if (err) {
          console.log(err);
          return;
        }
        if (result.length === 1) {
        //找到唯一匹配, 之后进行密码匹配
          var truePassword = result[0].password;
          if (md5(reqData.password + reqData.email) === truePassword) {
            global.SNS.loginList.push(reqData.email); //只是一个登录列表
            res.cookie('email', reqData.email, { signed: true, maxAge: 1000 * 3600 * 24 });
            res.send(JSON.stringify({ success: true }));
            //res.render('main', { title: 'LOGIN!' });
          } else {
            res.send(JSON.stringify({ error: '密码错误' }));
          }
        } else if (result.length < 1) { 
        //即 === 0, 未查找到
          res.send(JSON.stringify({ error: '未查找到' }));
        } else if (result.length > 1) { 
        //查找到超过一个document, 常规下这种情况不存在, 因为在插入时都进行唯一性判断, 
        //但是直接修改数据库可能会产生这种情况, 增加健壮性.
          res.send(JSON.stringify({ error: '找到超过一个' }));
        }
      });
    });
  });
});

/* register router */
router.post('/register', function(req, res) {
  //1. 连接数据库
  //2. 查询邮箱是否已被注册
  //3. 已注册 -> 提示, 未注册 -> 写入数据库
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    console.log('EXEC!! AFTER PARSE..');
    var reqData = fields;
    mongoClient.connect(mongoUrl, function(err, db) {
      var userInfo = db.collection('userInfo');
      userInfo.find({ email: reqData.email }).toArray(function(err, result) {
        if (err) {
          console.log(err);
          return;
        }
        if (result.length > 0) {  //有重复
          res.send(JSON.stringify({ error: '此邮箱已被注册' }));
        } else {  //无重复
          var data = {
            email: reqData.email,
            nickname: reqData.nickname,
            password: md5(reqData.password + reqData.email),
            mood: '',
            portrait: ''
          };
          userInfo.insert(data, { safe: true }, function(err, obj) {
            var data = {
              email: reqData.email,
              blogs: []
            };
            db.collection('userBlogs').insert(data, { safe: true }, function(err, obj) {
              var data = {
                email: reqData.email,
                friends: [],
                apply: []
              };
              db.collection('userFriends').insert(data, { safe: true }, function(err, obj) {
                if (!err) {
                  res.send(JSON.stringify({ success: true }));
                }
              });
            });
          });
        }
      });
    });
  });
});

module.exports = router;
