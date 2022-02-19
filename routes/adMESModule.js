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
router.get('/adProductionProjectAdd', function(req, res) {
    let userSql = 'SELECT userName, userId FROM user;'
    connection.query(userSql, function (err, users) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        res.render('adProductionProjectAdd', {
            user: req.session.user,
            users: users
        });
    });
});

/* POST adProjectAdd Page */
router.post('/adProductionProjectAdd', function (req, res) {
    var saveDate, year, month, day, hour, min, sec, dateOutput1, dateOutput2;
    saveDate = new Date();
    year = saveDate.getFullYear();
    month = saveDate.getMonth() + 1;
    day = saveDate.getDate();
    hour = saveDate.getHours();
    min = saveDate.getMinutes();
    sec = saveDate.getSeconds();
    dateOutput1 = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;
    dateOutput2= year.toString() +month.toString() + day.toString() + hour.toString() + min.toString() + sec.toString();


    var projectName, projectStartDate, projectFinishDate, projectManager, projectDesc, projectFolder;
    projectName = req.body.projectName;
    projectStartDate = req.body.projectStartDate;
    projectFinishDate = req.body.projectFinishDate;
    projectManager = req.body.projectManager;
    projectDesc = req.body.projectDesc;
    projectFolder = projectName + dateOutput2;

    // 项目名查重
    let unique = true;
    let checkProjectNameSQL = 'SELECT * FROM project WHERE projectName= ' + projectName;

    connection.query(checkProjectNameSQL, function (err, checkResult) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        if (checkResult.length !== 0) {
            unique = false;
            return res.send('项目添加失败：您所添加的项目【项目于名称】已存在于项目列表中。')
        } else if (unique) {
            let addSql = 'INSERT INTO project(projectName, projectStartDate, projectFinishDate, projectManager, projectDesc, projectFolder) VALUES(?,?,?,?,?)';
            let  addSqlParams = [projectName, projectStartDate, projectFinishDate, projectManager, projectDesc, projectFolder];

            connection.query(addSql,addSqlParams, function (err) {
                if (err) {
                    console.log('[INSERT ERROR] - 添加项目错误！\n ', err.message);
                    res.send('[INSERT ERROR] - 添加项目错误！\n ' + err);
                }
            });
        }
    });
    return res.redirect('/adProductionProjectMan')
});

//   ---删除项目---
/* GET adProjectDelete Page */
router.get('/adProductionProjectDelete', function(req, res) {
    let url=URL.parse(req.url,true).query;
    let delSql = 'DELETE FROM project WHERE projectId = ' + url.projectId ;
    connection.query(delSql,function (err) {
        if(err){
            console.log('[DELETE ERROR] - 删除项目错误！\n ', err.message);
            res.send('[DELETE ERROR] - 删除项目错误！\n ' + err);
            return;
        }
        res.redirect('/adBOMListCategoryMan')
    });
});

//   ---修改项目---
/* POST adProjectEdit Page */
router.post('/adProductionProjectEdit', function(req, res) {
    var saveDate, year, month, day, hour, min, sec, dateOutput1, dateOutput2;
    saveDate = new Date();
    year = saveDate.getFullYear();
    month = saveDate.getMonth() + 1;
    day = saveDate.getDate();
    hour = saveDate.getHours();
    min = saveDate.getMinutes();
    sec = saveDate.getSeconds();
    dateOutput1 = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;
    dateOutput2= year.toString() +month.toString() + day.toString() + hour.toString() + min.toString() + sec.toString();

    var projectName, projectStartDate, projectFinishDate, projectManager, projectDesc;
    projectName = req.body.projectName;
    projectStartDate = req.body.projectStartDate;
    projectFinishDate = req.body.projectFinishDate;
    projectManager = req.body.projectManager;
    projectDesc = req.body.projectDesc;

    let url=URL.parse(req.url,true).query;
    let modSql = 'UPDATE project SET projectName = ? projectStartDate = ? projectFinishDate = ? projectManager = ? projectDesc = ? WHERE projectId = ' + url.projectId;
    let modSqlParams = [projectName, projectStartDate, projectFinishDate, projectManager, projectDesc];
    connection.query(modSql,modSqlParams,function (err) {
        if(err){
            console.log('[UPDATE ERROR] - 更新项目信息错误！ ',err.message);
            res.send('[UPDATE ERROR] - 更新项目信息错误！ ' + err);
            return;
        }
        res.redirect('/adBOMListCategoryMan')
    });
});

//   ---查找项目主页---
/* GET adProjectMan */
router.get('/adProductionProjectMan', function(req, res) {
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
            res.render('adProductionProjectMan', {
                user:req.session.user,
                project: project,
                users: users,
            });
        });
    });
});


//   ---查找项目详细---
/* GET adProject */
router.get('/adProductionProject', function(req, res) {
    let url=URL.parse(req.url,true).query;
    let projectId = url.projectId;
    let projectSql = 'SELECT * FROM project WHERE projectId = ' + projectId;
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