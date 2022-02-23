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
    var saveDate, year, month, day, hour, min, sec, dateOutput;
    saveDate = new Date();
    year = saveDate.getFullYear();
    month = saveDate.getMonth() + 1;
    day = saveDate.getDate();
    hour = saveDate.getHours();
    min = saveDate.getMinutes();
    sec = saveDate.getSeconds();
    dateOutput = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;

    var projectName, projectManager, projectStartDate, projectFinishDate, progressRate, projectState, projectDesc, projectFolder, projectCode;
    projectName = req.body.projectName;
    projectManager = req.body.projectManager;
    projectStartDate = req.body.projectStartDate;
    projectFinishDate = req.body.projectFinishDate;
    progressRate = 0;
    projectState = '待确认';
    projectDesc = req.body.projectDesc;
    projectFolder = projectName;

    // 项目名查重
    let unique = true;
    let checkProjectNameSQL = 'SELECT * FROM project WHERE projectName= ' + projectName;
    let maxProjectCodeSql = 'SELECT MAX(projectCode) AS maxProjectCode FROM project;'

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

            connection.query(maxProjectCodeSql, function (err, maxProjectCode) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    res.send(err);
                    return;
                }

                maxProjectCode = maxProjectCode[0].maxProjectCode;
                console.log(maxProjectCode);
                if (projectCode.substring(2,5) === year.toString()){
                    projectCode = 'PP' + year + (parseInt(maxProjectCode.substring(6)) + 1).toString();
                } else {
                    projectCode = 'PP' + year + '001';
                }


                let addSql = 'INSERT INTO project(projectName, projectManager, projectStartDate, projectFinishDate, progressRate, projectState, projectDesc, projectFolder, projectCode) VALUES(?,?,?,?,?,?,?,?,?)';
                let  addSqlParams = [projectName, projectManager, projectStartDate, projectFinishDate, progressRate, projectState, projectDesc, projectFolder, projectCode];

                connection.query(addSql,addSqlParams, function (err) {
                    if (err) {
                        console.log('[INSERT ERROR] - 添加项目错误！\n ', err.message);
                        res.send('[INSERT ERROR] - 添加项目错误！\n ' + err);
                    }
                });
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
/* POST adProductionProjectEdit Page */
router.post('/adProductionProjectEdit', function(req, res) {
    var saveDate, year, month, day, hour, min, sec, dateOutput;
    saveDate = new Date();
    year = saveDate.getFullYear();
    month = saveDate.getMonth() + 1;
    day = saveDate.getDate();
    hour = saveDate.getHours();
    min = saveDate.getMinutes();
    sec = saveDate.getSeconds();
    dateOutput = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;

    var projectName, projectFinishDate, projectManager, projectDesc;
    projectName = req.body.projectName;
    projectFinishDate = req.body.projectFinishDate;
    projectManager = req.body.projectManager;
    projectDesc = req.body.projectDesc;

    let url=URL.parse(req.url,true).query;
    let modSql = 'UPDATE project SET projectName = ? projectFinishDate = ? projectManager = ? projectDesc = ? WHERE projectId = ' + url.projectId;
    let modSqlParams = [projectName, projectStartDate, projectFinishDate, projectManager, projectDesc];
    connection.query(modSql,modSqlParams,function (err) {
        if(err){
            console.log('[UPDATE ERROR] - 更新项目信息错误！ ',err.message);
            res.send('[UPDATE ERROR] - 更新项目信息错误！ ' + err);
            return;
        }
        res.redirect('/adProductionProjectMan')
    });
});

//   ---查找项目主页---
/* GET adProductionProjectMan */
router.get('/adProductionProjectMan', function(req, res) {
    let projectSql = 'SELECT projectId, projectName, projectCode, projectState, projectManager, projectStartDate, projectFinishDate, progressRate FROM project;';

    connection.query(projectSql,function (err,project) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            res.send('查找设备出错：' + '\n' + err);
            return;
        }
        res.render('adProductionProjectMan', {
            user:req.session.user,
            project: project,
        });
    });
});


//   ---查找项目详细---
/* GET adProductionProject */
router.get('/adProductionProject', function(req, res) {
    let url=URL.parse(req.url,true).query;
    let projectId = url.projectId;
    let projectMachineSql = 'SELECT * FROM project JOIN p_machine ON project.projectId = p_machine.projectId WHERE project.projectId = ' + projectId;
    let userSql = 'SELECT userName,role FROM user;';
    connection.query(userSql, function (err, users) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        connection.query(projectMachineSql, function (err, projectMachine) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                res.send('查找项目详细页面出错：' + '\n' + err);
                return;
            }

            if (projectMachine.length === 0){
                let projectSql = 'SELECT * FROM project WHERE projectId = ' + projectId;
                connection.query(projectSql, function (err, project) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                        res.send('查找项目详细页面出错：' + '\n' + err);
                        return;
                    }
                    res.render('adProductionProject', {
                        user: req.session.user,
                        projectMachine: project,
                        users: users,
                    });
                });
            } else {
                res.render('adProductionProject', {
                    user: req.session.user,
                    projectMachine: projectMachine,
                    users: users,
                });
            }
        });
    });
});


//   ---添加生产设备详细---
/* GET adProductionMachineAdd */
router.get('/adProductionMachineAdd', function(req, res) {
    let url=URL.parse(req.url,true).query;
    let projectSql = 'SELECT * FROM project;';
    let machineSql = 'SELECT * FROM machine;';

    connection.query(projectSql,function (err,project) {
        connection.query(machineSql, function (err, machine) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                res.send('查找设备出错：' + '\n' + err);
                return;
            }
            res.render('adProductionMachineAdd', {
                user: req.session.user,
                project: project,
                machine: machine,
                url:url
            });
        });
    });
});


//   ---查找设备部件---  A-B-C  设备，部件，物料
/* AJax get component List */
router.get('/ajaxProductionMachines', function(req, res) {
    const machineId = req.query.machineId;
    const sql = 'SELECT *\n' +
        'FROM project \n' +
        'INNER JOIN p_machine\n' +
        'ON project.projectId = p_machine.projectId\n' +
        'ORDER BY projectCode'

    connection.query( sql,function (err, machine) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        var HTMLText='';
        for(var j=0;j<machine.length;j++){
            HTMLText +=
                '                                    <div class="noteButton" cellspacing="0" cellpadding="0" style="width: 122.5%; ">\n' +
                '                                        <tbody><tr class="noteButton" style="width: 87%;" id="' + machine[j].machineId + j + '">\n' +
                '                                            <td style="width: 80%;">\n' +
                '                                                <div class="noteButton" name="componentBtn" id="DSII-46F-ST256" value="0" style="padding-left: 80px;" type="button" onclick="">\n' +
                '                                                    <div style="font-size: 0.7rem; height: 30px; ">\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: -50px;color: #0050fa;   ">设备&nbsp;1</span>\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 0px">名称：<a style="font-weight: normal;color: #0050fa;">' + machine[j].machineName + '</a></span>\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 270px">型号：<a style="font-weight:normal;color: #0050fa; ">' + machine[j].machineId + j + '</a></span>\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 460px">状态：<a style="font-weight:normal;color: #0050fa; ">' + machine[j].productionState + '</a></span>\n' +
                '                                                    </div>\n' +
                '                                                    <div style="font-size: 0.7rem; height: 30px; ">\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 0px">序列号：<a style="font-weight:normal;color: #0050fa; ">' + machine[j].machineCode + '</a></span>\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 180px">对应订单：<a style="font-weight:normal;color: #0050fa; ">order2022001</a></span>\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 355px;">周期：<a style="font-weight:normal;color: #0050fa; ">2022-02-15&nbsp;至&nbsp;2022-03-15</a></span>\n' +
                '                                                    </div>\n' +
                '                                                    <div style="font-size: 0.7rem; height: 30px;" id="">\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 0px">出仓进度：<a style="font-weight: normal;color: #0050fa;">95.5%</a></span>\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 150px">质检进度：<a style="font-weight:normal;color: #0050fa; ">50.5%</a></span>\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 300px">任务进度：<a style="font-weight:normal;color: #0050fa; ">20.5%</a></span>\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 460px">总进度：<a style="font-weight:normal;color: #0050fa; ">80%</a></span>\n' +
                '                                                    </div>\n' +
                '                                                </div>\n' +
                '                                            </td>\n' +
                '                                            <td  style="width: 13%!important;">\n' +
                '                                                <table cellspacing="0" cellpadding="0" style="width: 100%">\n' +
                '                                                    <tbody>\n' +
                '                                                    <tr>\n' +
                '                                                        <td>\n' +
                '                                                            <button class="itemButton2" style="height: 90px;border: 0" type="button" onclick="location.href=\'/adBOMList?componentId=256\'"><img src="images/machine.png" height="50px" width="50px"></button>\n' +
                '                                                        </td>\n' +
                '                                                    </tr>\n' +
                '                                                    </tbody>\n' +
                '                                                </table>\n' +
                '                                            </td>\n' +
                '                                        </tr>\n' +
                '                                        <tr cellspacing="0" cellpadding="0" id="" style="width: 100%">\n' +
                '                                        </tr>\n' +
                '                                        </tbody>' +
                '                                    </div>'

        }
        res.json({
            machine:machine,
            HTMLText:HTMLText
        });

    });
});



module.exports = router;