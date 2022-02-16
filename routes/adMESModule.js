var express = require('express');
var router = express.Router();
var qr = require('qr-image');
var mysql=require('mysql');
var pinyin = require("pinyin");
const URL=require('url');
var multer = require('multer');
const {response} = require("express");
var connection=require('../databaseConfig/config').connection();


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

// router.get('/qrCodeTest', function(req, res, next) {
//
//     res.render('qrCodeTest', { title: ' ' });
// });










/*                            ***************************************************生产管理***************************************************                  */



/* POST adBOMListCategoryAdd Page */
router.post('/adBOMListCategoryAdd', function (req, res) {
    let unique = true;
    let addCategoryName = req.body.addCategoryName
    let checkCategoryNameSQL = 'SELECT * FROM category WHERE categoryName= '+'\''+ addCategoryName + '\'';

    connection.query(checkCategoryNameSQL, function (err, checkResult) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        if (checkResult.length !== 0) {
            unique = false;
            return res.send('分类添加失败：您所添加的分类【分类名称】已存在于分类列表中。')
        } else if (unique) {
            let addSql = 'INSERT INTO category(categoryName) VALUES(?)';
            // let addSql = 'INSERT INTO category(categoryName = ?)';
            let  addSqlParams = [addCategoryName];

            connection.query(addSql,addSqlParams, function (err) {
                if (err) {
                    console.log('[INSERT ERROR] - ', err.message);
                    res.send(err);
                }
            });

        }
        return res.redirect('/adBOMListCategoryMan')
    });
});

//   ---删除分类---
/* GET adBOMListCategoryDelete Page */
router.get('/adBOMListCategoryDelete', function(req, res) {
    let url=URL.parse(req.url,true).query;
    let delSql = 'DELETE FROM category WHERE categoryId = '+'\''+url.categoryId+'\'';
    connection.query(delSql,function (err) {
        if(err){
            console.log('[DELETE ERROR] - ',err.message);
            res.send(err);
            return;
        }
        res.redirect('/adBOMListCategoryMan')
    });
});

//   ---修改分类---
/* GET adBOMListCategoryEdit Page */
router.get('/adBOMListCategoryEdit', function(req, res) {
    let url=URL.parse(req.url,true).query;
    let sql = 'SELECT * FROM category WHERE categoryId = '+'\''+url.categoryId+'\'';
    connection.query(sql,function (err,result) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            res.send(err);
            return;
        }
        res.render('adBOMListCategoryEdit', {
            user: req.session.user,
            category: result[0]
        })
    });
});
/* POST adBOMListCategoryEdit Page */
router.post('/adBOMListCategoryEdit', function(req, res) {
    let url=URL.parse(req.url,true).query;
    let modSql = 'UPDATE category SET categoryName = ? WHERE categoryId = '+'\''+url.categoryId+'\'';
    let modSqlParams = [req.body.editCategoryName];
    connection.query(modSql,modSqlParams,function (err) {
        if(err){
            console.log('[UPDATE ERROR] - ',err.message);
            res.send(err);
            return;
        }
        res.redirect('/adBOMListCategoryMan')
    });
});

//   ---查找项目主页---
/* GET adProjectMan */
router.get('/adProjectMan', function(req, res) {
    let projectSql = 'SELECT * FROM project;';
    let userSql = 'SELECT userName,role FROM user;';

    connection.query(projectSql,function (err,project) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            res.send('查找设备出错：' + '\n' + err);
            return;
        }
        connection.query(userSql,function (err, users) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                res.send(err);
                return;
            }
            res.render('adProjectMan', {
                user:req.session.user,
                project: project,
                users: users,
            });
        });
    });
});


//   ---查找项目详细---
/* GET adProject */
router.get('/adProject', function(req, res) {
    let projectSql = 'SELECT * FROM project;';
    let userSql = 'SELECT userName,role FROM user;';

    connection.query(projectSql,function (err,project) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            res.send('查找设备出错：' + '\n' + err);
            return;
        }
        connection.query(userSql,function (err, users) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                res.send(err);
                return;
            }
            res.render('adProject', {
                user:req.session.user,
                project: project,
                users: users,
            });
        });
    });
});



















module.exports = router;