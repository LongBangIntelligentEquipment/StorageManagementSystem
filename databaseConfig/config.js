var mysql      = require('mysql');
var multer = require('multer');

module.exports = {
    connection:function connection() {
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
        return connection
},

}






