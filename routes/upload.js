var express = require('express');
var router = express.Router();
router.get('/', function(req, res, next) {
    res.render('upload')
})
var multer = require('multer')

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // 接收到文件后输出的保存路径（若不存在则需要创建）
        cb(null, 'upload');
    },
    filename: function(req, file, cb) {
        // 将保存文件名设置为 时间戳 + 文件原始名，比如 151342376785-123.jpg
        cb(null,  file.originalname);
    }
});

var upload = multer({
    storage: storage
})
//如果一直出现500报错信息 Node Multer unexpected field 则需要如此操作
var type = upload.single('avatra')
//
router.post('/', type, function(req, res, next) {
    res.send('上传成功')
})
module.exports = router;