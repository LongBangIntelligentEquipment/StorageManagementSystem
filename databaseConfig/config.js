var mysql      = require('mysql');
var multer = require('multer');
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

//文件上传参数=======
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // 接收到文件后输出的保存路径（若不存在则需要创建）
        cb(null, './public/uploads');
    },
    filename: function(req, file, cb) {
        var fileName='';

        if(req.body.updateFileName!==undefined){
            fileName=file.originalname;
        }
        // 将保存文件名设置为 时间戳 + 文件原始名，比如 151342376785-123.jpg
        cb(null, file.originalname );
    }
});

var upload = multer({
    storage: storage,

});