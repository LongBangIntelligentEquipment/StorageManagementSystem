var express = require('express');
var router = express.Router();
var mysql=require('mysql');
const URL=require('url');
var connection = mysql.createConnection({

  host     : '192.168.0.127',
  port     : '3306',
  user     : 'root',
  password : 'LongBang***',
  //database : 'storagedb',  //服务器数据库
  database : 'dbfordevelop', //开发用数据库
  multipleStatements: true,
  connectTimeout:false

  // host     : 'localhost',
  // port     : '3306',
  // user     : 'root',
  // password : '123456',
  // database : 'storagedb',
  // multipleStatements: true,
  // connectTimeout:false

});

/* GET users listing. */
router.get('/adUserMan', function(req, res, next) {
  var sql;
  var url=URL.parse(req.url,true).query;
  //console.log(url)
  if(url.sql===undefined){
    sql='SELECT * ,\n' +
        'case when role=\'系统管理员\' THEN 1\n' +
        'WHEN role!=\'未授权\' THEN 2\n' +
        'WHEN state=\'在职\' THEN 3\n' +
        'WHEN state=\'离职\' THEN 4 \n' +
        'END AS userParam\n' +
        'FROM user\n' +
        'ORDER BY userParam;';
    //sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId  ORDER BY orderlist.orderDate DESC';
  }else {
    sql=url.sql;
  }

  connection.query( sql,function (err, result) {
    if (err) {
      console.log('[SELECT ERROR] - ', err.message);
    }


    // console.log(result)
    res.render('adUserMan', {
      userList:result,
      user:req.session.user

    });

  });
});

module.exports = router;
