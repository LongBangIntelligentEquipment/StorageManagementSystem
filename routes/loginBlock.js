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

   // Hash Password
const { createHash } = require('crypto');
function hash(string) {
    return createHash('sha256').update(string).digest('hex');
}

router.get('/login', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    if(url.tips===''){
       return  res.render('login', { tips:'' });
    }    else{
       return  res.render('login', { tips:url.tips });
    }
});

router.post('/login', function(req, res, next) {


    var userId=req.body.userId;
    var hashedPassword=hash(req.body.password);

    var sql='SELECT * FROM user WHERE userId=\''+userId+'\'';
    connection.query(sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }

        if(result.length===0){
            return  res.render('login', {tips:'您所输入的账号未被注册，请再次确认后重试。'  });
        }else{
            if( result[0].password===hashedPassword ){
                if(result[0].role!=='未授权'){
                    req.session.user=result[0];
                   return  res.redirect('adminHome');
                }else{
                    req.session.user=null;
                    return  res.render('login', {tips:'您的账户未被授权，请待管理员确认后登录系统。'  });
                }

            }else{
               return  res.render('login', {tips:'账号与密码不匹配，请重试。'  });
            }
        }
    });

});

router.all('/resetPassword', function (req, res, next) {
    var url=URL.parse(req.url,true).query;
    if(url.tips===''){
        return  res.render('resetPassword', { tips:'' });
    }    else{
        return  res.render('resetPassword', { tips:url.tips });
    }
});

router.all('/ajaxResetPassword', function(req, res, next) {
    let userId = req.body.userId;
    let resetPW = req.body.resetPW;
    let sql = 'SELECT * FROM user WHERE userId=\'' + userId + '\'';
    connection.query(sql, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        if (userId === undefined) {
            return res.send('请输入正确工号!');
        } else if (result.length === 0) {
            return res.send('请输入正确工号!');
        } else if (resetPW.length === 0){
            return res.send('请输入重置密码!');
        } else {
            let copyText = hash(resetPW);
            // copyText.select();
            // document.execCommand("copy");

            // document.body.appendChild(copyText);
            // copyText.value = hash(copyText);  // 这里表示想要复制的内容
            // copyText.focus();
            // copyText.select();
            // if (document.execCommand('copy')) {
            //     document.execCommand('copy');
            // }
            // copyText.blur();
            // console.log('复制成功');
            // document.body.removeChild(copyText);

            return res.send(copyText);
        }

    });
});


router.get('/logout',function (req,res,next) {
    req.session.user=null;
    res.redirect('login');
});

router.get('/register', function(req, res, next) {
    res.render('register', {tips:''  });
});

router.post('/register', function(req, res, next) {
    var userId=req.body.userId;
    var userName=req.body.userName;
    var joinedDate=req.body.joinedDate;
    var contact=req.body.contact;
    var DoB=req.body.DoB;
    var password=hash(req.body.password);
    var confirmPassword=hash(req.body.confirmPassword);

    var sql='SELECT * FROM user WHERE userId=\''+userId+'\'';

    connection.query(sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }

        if(result.length===0){

                if(password!==confirmPassword){
                    res.render('register', {tips:'再次输入的密码与设定密码不一致，请重试！'  });
                }else{

                    var addSql='INSERT INTO user (userId,userName,password,role,state,post,contact,DoB,joinedDate,departureDate) VALUES (?,?,?,?,?,?,?,?,?,?)';
                    var addSqlParams=[userId,userName,password,'未授权','在职','待确认',contact,DoB,'2001-01-01 00:00:00','2001-01-01 00:00:00'];


                    connection.query(addSql,addSqlParams,function (err, result) {
                        if(err){
                            console.log('[INSERT ERROR] - ',err.message);
                            return;
                        }
                        return  res.redirect('login?tips=注册成功，待管理员确认后即可登录系统。');
                    });
                }

        }else{
          return  res.render('register', {tips:'此工号已被注册，请重新确认您的工号！'  });
        }
    });


});



module.exports = router;