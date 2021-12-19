var express = require('express');
var router = express.Router();
var mysql=require('mysql');
const URL=require('url');
var connection=require('../databaseConfig/config').connection();

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
