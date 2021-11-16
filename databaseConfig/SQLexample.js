var mysql      = require('mysql');
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

connection.connect();

connection.query('SELECT 1 + 1 AS solution', function (error, results, fields) {
    if (error) throw error;
    console.log('The solution is: ', results[0].solution);
});


//查
var  sql = 'SELECT * FROM websites'; //select id,name From websites=rowDataPacket{id,name}
connection.query(sql,function (err, result) {
    if(err){
        console.log('[SELECT ERROR] - ',err.message);
        return;
    }

    console.log('--------------------------SELECT----------------------------');
    console.log(result);//result[0].id= 1
    console.log('------------------------------------------------------------\n\n');
});



//增
var  addSql = 'INSERT INTO websites(Id,name,url,alexa,country) VALUES(0,?,?,?,?)';
var  addSqlParams = ['菜鸟工具', 'https://c.runoob.com','23453', 'CN'];
connection.query(addSql,addSqlParams,function (err, result) {
    if(err){
        console.log('[INSERT ERROR] - ',err.message);
        return;
    }

    console.log('--------------------------INSERT----------------------------');
    //console.log('INSERT ID:',result.insertId);
    console.log('INSERT ID:',result);
    console.log('-----------------------------------------------------------------\n\n');
});

var modSql = 'UPDATE websites SET name = ?,url = ? WHERE Id = ?';
var modSqlParams = ['菜鸟移动站', 'https://m.runoob.com',6];
//改
connection.query(modSql,modSqlParams,function (err, result) {
    if(err){
        console.log('[UPDATE ERROR] - ',err.message);
        return;
    }
    console.log('--------------------------UPDATE----------------------------');
    console.log('UPDATE affectedRows',result.affectedRows);
    console.log('-----------------------------------------------------------------\n\n');
});

var delSql = 'DELETE FROM websites where id=6';
//删
connection.query(delSql,function (err, result) {
    if(err){
        console.log('[DELETE ERROR] - ',err.message);
        return;
    }

    console.log('--------------------------DELETE----------------------------');
    console.log('DELETE affectedRows',result.affectedRows);
    console.log('-----------------------------------------------------------------\n\n');
});
connection.end();
