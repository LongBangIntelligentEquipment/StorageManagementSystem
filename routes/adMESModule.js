var express = require('express');
var router = express.Router();
var qr = require('qr-image');
var mysql=require('mysql');
var pinyin = require("pinyin");
const URL=require('url');
var multer = require('multer');
const {response} = require("express");
const {promises} = require("fs");
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



//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//
/*******************************  function  *********************************************/
function getDateTime(){
    var saveDate, year, month, day, hour, min, sec, dateTime;
    saveDate = new Date();
    year = saveDate.getFullYear();
    month = saveDate.getMonth() + 1;
    day = saveDate.getDate();
    hour = saveDate.getHours();
    min = saveDate.getMinutes();
    sec = saveDate.getSeconds();
    dateTime = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;
    return dateTime;
}







/*                            ***************************************************生产管理***************************************************                  */

/*                            ****************************************项目增删改查******************************************                  */
//   ---添加项目---
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
    var saveDate, year, month, day, hour, min, sec, projectUpdateTime;
    saveDate = new Date();
    year = saveDate.getFullYear();
    month = saveDate.getMonth() + 1;
    day = saveDate.getDate();
    hour = saveDate.getHours();
    min = saveDate.getMinutes();
    sec = saveDate.getSeconds();
    projectUpdateTime = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;

    var projectName, projectManager, projectStartDate, projectFinishDate, progressRate, projectState, projectDesc, projectFolder, projectCode;
    projectName = req.body.projectName;
    projectManager = req.body.projectManager;
    projectStartDate = req.body.projectStartDate;
    projectFinishDate = req.body.projectFinishDate;
    progressRate = 0;
    projectState = '待确认';
    projectDesc = req.body.projectDesc;

    // 项目名查重, 查找最大代码。
    let unique = true;
    let checkProjectNameSQL = 'SELECT * FROM project WHERE projectName= "' + projectName + '";';
    connection.query(checkProjectNameSQL, function (err, checkResult) {
        if (err) {
            console.log('[SELECT ERROR] - 项目名查重错误！', err.message);
            res.send('[SELECT ERROR] - 项目名查重错误！\n' + err);
            return;
        }
        if (checkResult.length !== 0) {
            unique = false;
            return res.send('项目添加失败：您所添加的项目【项目于名称】已存在于项目列表中。')
        } else if (unique) {

            let maxProjectCodeSql = 'SELECT MAX(projectCode) AS maxProjectCode FROM project;'
            connection.query(maxProjectCodeSql, function (err, maxProjectCode) {
                if (err) {
                    console.log('[SELECT ERROR] - 查找最大项目代号错误！', err.message);
                    res.send('[SELECT ERROR] - 查找最大项目代号错误！\n' + err);
                    return;
                }

                maxProjectCode = maxProjectCode[0].maxProjectCode;
                if (maxProjectCode.substring(2,6) === year.toString()){
                    projectCode = 'PP' + year + '00' + (parseInt(maxProjectCode.substring(6)) + 1).toString();
                } else {
                    projectCode = 'PP' + year + '001';
                }
                projectFolder = projectCode;

                let addSql = 'INSERT INTO project(projectName, projectManager, projectStartDate, projectFinishDate, progressRate, projectState, projectDesc, projectFolder, projectCode, projectUpdateTime) VALUES(?,?,?,?,?,?,?,?,?,?)';
                let addSqlParams = [projectName, projectManager, projectStartDate, projectFinishDate, progressRate, projectState, projectDesc, projectFolder, projectCode, projectUpdateTime];

                connection.query(addSql,addSqlParams, function (err) {
                    if (err) {
                        console.log('[INSERT ERROR] - 添加项目错误！\n ', err.message);
                        res.send('[INSERT ERROR] - 添加项目错误！\n ' + err);
                    }
                });
            });
        }
    });
    let flashUrl = '/adProductionProjectMan';
    return res.redirect('flash?url='+flashUrl);
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
        res.redirect('/adProductionProjectMan')
    });
});

//   ---修改项目---
/* POST adProductionProjectEdit Page */
router.post('/adProductionProjectEdit', function(req, res) {
    let url=URL.parse(req.url,true).query;
    var saveDate, year, month, day, hour, min, sec, projectUpdateTime;
    saveDate = new Date();
    year = saveDate.getFullYear();
    month = saveDate.getMonth() + 1;
    day = saveDate.getDate();
    hour = saveDate.getHours();
    min = saveDate.getMinutes();
    sec = saveDate.getSeconds();
    projectUpdateTime = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;

    var projectId, projectName, projectFinishDate, projectManager, projectDesc;
    projectId = url.projectId;
    projectName = req.body.projectName;
    projectFinishDate = req.body.projectFinishDate;
    projectManager = req.body.projectManager;
    projectDesc = req.body.projectDesc;

    let modSql, modSqlParams
    if (projectFinishDate !== ""){
        modSql = 'UPDATE project SET projectName = ?, projectFinishDate = ?, projectManager = ?, projectDesc = ?, projectUpdateTime = ? WHERE projectId = ' + projectId;
        modSqlParams = [projectName, projectFinishDate, projectManager, projectDesc, projectUpdateTime];
    } else {
        modSql = 'UPDATE project SET projectName = ?, projectManager = ?, projectDesc = ?, projectUpdateTime = ? WHERE projectId = ' + projectId;
        modSqlParams = [projectName, projectManager, projectDesc, projectUpdateTime];
    }

    connection.query(modSql,modSqlParams,function (err) {
        if(err){
            console.log('[UPDATE ERROR] - 更新项目信息错误！ ',err.message);
            res.send('[UPDATE ERROR] - 更新项目信息错误！ ' + err);
            return;
        }
        res.redirect('/adProductionProject?projectId='+projectId)
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
                        projectMachineCount: 0
                    });
                });
            } else {
                res.render('adProductionProject', {
                    user: req.session.user,
                    projectMachine: projectMachine,
                    users: users,
                    projectMachineCount: projectMachine.length
                });
            }
        });
    });
});


//   ---查找项目设备---
/* AJax get machine List */
router.get('/ajaxProductionMachines', function(req, res) {
    const projectId = req.query.projectId;
    const sql = 'SELECT *\n' +
        'FROM project \n' +
        'INNER JOIN p_machine\n' +
        'ON project.projectId = p_machine.projectId\n' +
        'WHERE project.projectId = "' + projectId + '"\n' +
        'ORDER BY project.projectId'

    connection.query( sql,function (err, machine) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }

        var HTMLText='';
        for(var j=0;j<machine.length;j++){
            HTMLText +=
                '                                    <table class="noteButton" cellspacing="0" cellpadding="0" style="width: 122.5%; ">\n' +
                '                                        <tbody><tr class="noteButton" style="width: 87%;" id="' + machine[j].machineId + j + '">\n' +
                '                                            <td style="width: 80%;">\n' +
                '                                                <div class="noteButton" name="componentBtn" id="DSII-46F-ST256" value="0" style="padding-left: 80px;" type="button" onclick="">\n' +
                '                                                    <div style="font-size: 0.7rem; height: 30px; ">\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: -50px;color: #0050fa;   ">设备&nbsp;'+ j + '</span>\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 0px">名称：<a style="font-weight: normal;color: #0050fa;">' + machine[j].machineName + '</a></span>\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 270px">型号：<a style="font-weight:normal;color: #0050fa; ">' + machine[j].machineId + j + '</a></span>\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 460px">状态：<a style="font-weight:normal;color: #0050fa; ">' + machine[j].productionState + '</a></span>\n' +
                '                                                    </div>\n' +
                '                                                    <div style="font-size: 0.7rem; height: 30px; ">\n' +
                '                                                        <span class="MachineProductionInfo" style="margin-left: 0px">序列号：<a style="font-weight:normal;color: #0050fa; ">' + machine[j].p_machineId + '</a></span>\n' +
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
                '                                                            <button class="itemButton2" style="height: 90px;border: 0" type="button" onclick="location.href=\'/adProductionMachineMan?p_machineId='+machine[j].p_machineId+'\'"><img src="images/machine.png" height="50px" width="50px"></button>\n' +
                '                                                        </td>\n' +
                '                                                    </tr>\n' +
                '                                                    </tbody>\n' +
                '                                                </table>\n' +
                '                                            </td>\n' +
                '                                        </tr>\n' +
                '                                        <tr cellspacing="0" cellpadding="0" id="" style="width: 100%">\n' +
                '                                        </tr>\n' +
                '                                        </tbody>' +
                '                                    </table>'

        }
        res.json({
            machine:machine,
            HTMLText:HTMLText
        });
    });
});

/*                            ***************************************************生产设备增删改查***************************************************                  */
//   ---添加生产设备---
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

/* POST adBOMListMachineAdd */
router.post('/adProductionMachineAdd', async function (req, res) {

    function getMaxMachineCode() {
        return new Promise((resolve, reject) => {
            let maxMachineCodeSql = 'SELECT MAX(p_machineId) AS maxMachineCode FROM p_machine;'
            connection.query(maxMachineCodeSql, function (err, maxMachineCode) {
                if (err) {
                    console.log('[SELECT ERROR] - 查找最大项目代号错误！\n', err.message);
                    reject(err);
                }
                maxMachineCode = maxMachineCode[0].maxMachineCode;
                // console.log("maxMachineCode = " + maxMachineCode);
                resolve(maxMachineCode);
            });
        });
    }

    async function formatMachineCode() {
        let machineCode = await getMaxMachineCode();
        let formattedMachineCode;
        let year = new Date().getFullYear();
        if (machineCode.substring(2, 6) === year.toString()) {
            formattedMachineCode = parseInt(machineCode.substring(6)) + 1;
        } else {
            formattedMachineCode = 1;
        }
        formattedMachineCode = formattedMachineCode.toString().padStart(3, '0');
        formattedMachineCode = 'PM' + year + formattedMachineCode;
        // console.log("formattedMachineCode = " + formattedMachineCode);
        return formattedMachineCode;
    }

    async function addProductionMachine(machineId, addQtyIndex) {
        let machine = await getBOMListMachine(machineId);

        let p_machineId, b_machineId, machineName, updateTime, productionStart, productionFinish,
            productionState, note, designer, machineCost, machineFileName, customerOrderId,
            exitProgressRate,
            QCProgressRate, taskProgressRate;
        let year = new Date().getFullYear();
        let today = getDateTime();

        p_machineId = 'PM' + year + '000';
        b_machineId = machine[0].machineId;
        machineName = machine[0].machineName;
        updateTime = today;
        productionStart = today;
        productionFinish = today;
        productionState = '审核中';
        note = machine[0].note;
        designer = machine[0].designer;
        machineCost = machine[0].machineCost;
        machineFileName = machine[0].machineFileName;
        customerOrderId = 'order' + year + '000';
        exitProgressRate = 0;
        QCProgressRate = 0;
        taskProgressRate = 0;

        let addSql = 'INSERT INTO p_machine(p_machineId, machineId, machineName, updateTime, productionStart, productionFinish, productionState, note, designer, machineCost, machineFileName, projectId, customerOrderId, exitProgressRate, QCProgressRate, taskProgressRate) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
        let addComponentSql = 'INSERT INTO p_component(p_machineId, componentId, componentName, componentModel, updateTime, componentState, componentNote, componentProductionManager, categoryId, cost, componentFileName) VALUES(?,?,?,?,?,?,?,?,?,?,?)';

        // console.log("eachAddQty: " + eachAddQty);
        while (eachAddQty > 0) {

            p_machineId = await formatMachineCode();
            let addSqlParams = [p_machineId, b_machineId, machineName, updateTime, productionStart, productionFinish, productionState, note, designer, machineCost, machineFileName, projectId, customerOrderId, exitProgressRate, QCProgressRate, taskProgressRate];
            // console.log(addSqlParams);
            await addProductionMachineDB(addSql, addSqlParams);

            let components = await getBOMListComponent(machineId);

            console.log("components result:" + components);

            for (let c in components) {
                let componentId, componentName, componentModel, updateTime, componentState, componentNote,
                    componentProductionManager, categoryId, cost, componentFileName;
                componentId = components[c].componentId;
                componentName = components[c].componentName;
                componentModel = components[c].componentModel;
                updateTime = components[c].updateTime;
                componentState = "生产中";
                componentNote = components[c].componentNote;
                categoryId = components[c].categoryId;
                cost = components[c].cost;
                componentFileName = components[c].componentFileName;

                componentProductionManager = req.session.user;

                let addComponentSqlParams = [p_machineId, componentId, componentName, componentModel, updateTime, componentState, componentNote, componentProductionManager, categoryId, cost, componentFileName];

                console.log("addComponentSqlParams: " + addComponentSqlParams)

                await addProductionComponentDB(addComponentSql, addComponentSqlParams);


            }


            eachAddQty--;
        }


    }

    function getBOMListMachine(machineId) {
        let machineSql = 'SELECT * FROM machine WHERE machineId ="' + machineId + '";';
        return new Promise((resolve, reject) => {
            connection.query(machineSql, function (err, data) {
                if (err) {
                    console.log('[SELECT ERROR] - 查找设备错误！\n', err.message);
                    reject(err);
                }
                resolve(data);
            });
        });
    }

    function addProductionMachineDB(addSql, addSqlParams) {
        return new Promise((resolve, reject) => {
            connection.query(addSql, addSqlParams, function (err, data) {
                if (err) {
                    console.log('[INSERT ERROR] - 添加项目设备错误！\n', err.message);
                    reject(err);
                }
                resolve(data);
            });
        });
    }

    function getBOMListComponent(machineId) {
        let componentSql = 'SELECT * FROM component WHERE machineId ="' + machineId + '";';
        return new Promise((resolve, reject) => {
            connection.query(componentSql, function (err, data) {
                if (err) {
                    console.log('[SELECT ERROR] - getBOMListComponent 查找项目部件错误！\n', err.message);
                    reject(err);
                }
                resolve(data);
            });
        });
    }

    function addProductionComponentDB(addSql, addSqlParams) {
        return new Promise((resolve, reject) => {
            connection.query(addSql, addSqlParams, function (err, data) {
                if (err) {
                    console.log('[INSERT ERROR] - addProductionComponentDB 添加项目部件错误！\n', err.message);
                    reject(err);
                }
                resolve(data);
            });
        });
    }

    // Main Function addProductionMachine

    // let projectUpdateTime = getDateTime();
    let projectId, machineId, addQty;
    projectId = req.body.belongProject;
    machineId = req.body.belongMachine;
    addQty = req.body.addQty;
    let eachAddQty;

    console.log(machineId)
    console.log(addQty)

    if (Array.isArray(projectId)) {
        for (let i = 0; i < machineId.length; i++) {
            eachAddQty = addQty[i];
            await addProductionMachine(machineId[i], i);
            if (i === machineId.length) {
                res.redirect('/adProductionProjectMan');
            }
        }
    } else {
        eachAddQty = addQty;
        await addProductionMachine(machineId, 1);
        res.redirect('/adProductionProjectMan');
    }
});

//   ---删除生产设备---
/* POST adProductionMachineDelete */
router.get('/adProductionMachineDelete', function(req, res) {
    let url=URL.parse(req.url,true).query;
    const p_machineId = url.p_machineId;
    const projectId = url.projectId;
    let delSql = 'DELETE FROM p_machine WHERE p_machineId = "' + p_machineId + '";';
    console.log(delSql);
    connection.query(delSql,function (err) {
        if(err){
            console.log('[DELETE ERROR] - 删除生产设备错误！\n ', err.message);
            res.send('[DELETE ERROR] - 删除生产设备错误！\n ' + err);
            return;
        }
        res.redirect('/adProductionProject?projectId='+projectId);
    });
});

//   ---修改生产设备详细---


//   ---查找生产设备详细---
/* GET adProductionMachineMan */
router.get('/adProductionMachineMan', async function(req, res) {

    function getProductionMachineComponents(){
        return new Promise((resolve, reject) => {
            let machineComponentSql =
                'SELECT p_machine.machineId, p_machine.p_machineId, machineName, p_machine.updateTime AS mUpdateTime, productionStart, productionFinish, productionState, \n' +
                'p_machine.note AS mNote, designer, machineCost, customerOrderId, exitProgressRate, QCProgressRate, TaskProgressRate, projectId,\n' +
                'componentModel, componentName, p_component.updateTime AS cUpdateTime, componentNote AS cNote, cost AS componentCost, componentProductionManager, categoryName\n' +
                'FROM p_component\n' +
                'INNER JOIN p_machine\n' +
                'ON p_component.p_machineId = p_machine.P_machineId\n' +
                'INNER JOIN category\n' +
                'ON p_component.categoryId = category.categoryId\n' +
                'WHERE p_machine.p_machineId =  "'+ machineId +'"\n' +
                'ORDER BY category.categoryId;'

            connection.query(machineComponentSql, function (err, machineComponents) {
                if (err) {
                    console.log('[SELECT ERROR] - getProductionMachine\n', err.message);
                    reject();
                }
                resolve(machineComponents);
            });
        });
    }

    function getProductionMachine(){
        return new Promise((resolve, reject) => {
            let machineSql =
                'SELECT p_machine.machineId, p_machine.p_machineId, machineName, p_machine.updateTime AS mUpdateTime, productionStart, productionFinish, productionState, \n' +
                'p_machine.note AS mNote, designer, machineCost, customerOrderId, exitProgressRate, QCProgressRate, TaskProgressRate, projectId,\n' +
                'FROM p_machine\n' +
                'WHERE p_machineId =  "'+ machineId +'"'

            connection.query(machineSql, function (err, machine) {
                if (err) {
                    console.log('[SELECT ERROR] - getProductionMachine\n', err.message);
                    reject();
                }
                resolve(machine);
            });
        });
    }

    function getUsers(){
        return new Promise((resolve, reject) => {
            let userSql = 'SELECT userName,role FROM user;';

            connection.query(userSql, function (err, users) {
                if (err) {
                    console.log('[SELECT ERROR] - getProductionMachine\n', err.message);
                    reject();
                }
                resolve(users);
            });
        });
    }

    function getProjects(){
        return new Promise((resolve, reject) => {
            let projectSql = 'SELECT * FROM project;';
            connection.query(projectSql, function (err, projects) {
                if (err) {
                    console.log('[SELECT ERROR] - getProductionMachine\n', err.message);
                    reject();
                }
                resolve(projects);
            });
        });
    }


    let url=URL.parse(req.url,true).query;
    let machineId = url.p_machineId;

    let machineComponents = getProductionMachineComponents();
    let users = getUsers();
    let project = getProjects();

    // await Promise.all([machineComponent, users, projects]);

    machineComponents = await machineComponents;
    users = await users;
    project = await project;

    let componentCount = machineComponents.length;

    if (machineComponents.length === 0){
        machineComponents = await getProductionMachine();
        componentCount = 0;
    }


    res.render('adProductionMachineMan', {
        user: req.session.user,
        machineComponents: machineComponents,
        componentCount: componentCount,
        project: project,
        url: url,
        users: users
    })
});


//   ---从生产设备中增加部件---
/* GET adProductionComponentAdd*/
router.get('/adProductionComponentAdd', function(req, res) {
    var url, machineId, categorySql, machineSql, machineName;
    url = URL.parse(req.url,true).query;
    machineId = url.machineId;
    categorySql = 'SELECT categoryName FROM category;';
    machineSql = 'SELECT machineName FROM p_machine WHERE machineId = ' + '"' + machineId + '"' +';';

    connection.query(categorySql,function (err, categoryName) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send('查找类别出错：' + '\n' + err);
            return;
        }
        connection.query(machineSql,function (err, machine) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                res.send('查找设备出错：' + '\n' + err);
                return;
            }
            machineName = machine[0].machineName;
            res.render('adProductionComponentAdd', {
                user:req.session.user,
                categoryName: categoryName,
                machineName: machineName,
                machineId: machineId
            });
        });
    });
});




//   ---查找生产设备中的部件物料--- 详细页
/* GET adProductionComponentMan */
router.get('/adProductionComponentMan', function (req, res) {
    let url = URL.parse(req.url, true).query;
    // 部件有物料
    let componentItemSql = 'SELECT * ' +
        'FROM p_component\n' +
        'INNER JOIN component_has_item\n' +
        'ON component_has_item.component_componentId = component.componentId\n' +
        'INNER JOIN machine\n' +
        'ON component.machineId = machine.machineId\n' +
        'INNER JOIN item\n' +
        'ON component_has_item.item_itemId = item.itemId AND component_has_item.item_itemModel = item.itemModel\n' +
        'INNER JOIN category\n' +
        'ON component.categoryId = category.categoryId\n' +
        'INNER JOIN itemType\n' +
        'ON item.itemTypeId = itemtype.itemTypeId\n' +
        'INNER JOIN user\n' +
        'ON component.userId = user.userId\n' +
        'WHERE componentId =' + '\'' + url.componentId + '\'' + '\n' +
        'ORDER BY itemOrderBy, itemType';
    // 部件无物料
    let componentSql = 'SELECT *'+
        'FROM p_component\n' +
        'LEFT JOIN category\n' +
        'ON component.categoryId = category.categoryId\n' +
        'INNER JOIN machine\n' +
        'ON component.machineId = machine.machineId\n' +
        'INNER JOIN user\n' +
        'ON component.userId = user.userId\n' +
        'WHERE componentId =' + '\'' + url.componentId + '\'';
    let categorySql = 'SELECT * FROM category;';

    let machineSql = 'SELECT * FROM machine;';


    connection.query(machineSql,function (err,machine) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            res.send('查找设备出错：' + '\n' + err);
            return;
        }
        connection.query(categorySql, function (err, category) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                res.send(err);
                return;
            }
            connection.query(componentItemSql, function (err, componentItem) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    res.send(err);
                    return;
                }
                connection.query(categorySql,function (err, categoryName) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                        res.send('查找类别出错：' + '\n' + err);
                        return;
                    }

                    if (componentItem.length === 0){
                        connection.query(componentSql, function (err, component) {
                            if (err) {
                                console.log('[SELECT ERROR] - ', err.message);
                                res.send(err);
                                return;
                            }
                            if (component.length === 0){
                                res.send("部件不存在!")
                            } else {
                                res.render('adProductionComponentMan', {
                                    user: req.session.user,
                                    category: category,
                                    component: component,
                                    categoryName: categoryName,
                                    machine: machine,
                                });
                            }
                        });
                    }
                    else {
                        res.render('adProductionComponentMan', {
                            user: req.session.user,
                            category: category,
                            component: componentItem,
                            categoryName: categoryName,
                            machine: machine,
                        });
                    }
                });
            });
        });
    });
});


//   ---质检页面---
/* GET adProductionComponentQC */
router.get('/adProductionComponentQC', function(req, res) {
    let url=URL.parse(req.url,true).query;
    var qcTableSql='SELECT * FROM qctable'

    connection.query(qcTableSql,function (err,qcTable) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            res.send('查找设备出错：' + '\n' + err);
            return;
        }

        var QCfomatJsonStr =JSON.parse(JSON.stringify(eval('(' + qcTable[0].format + ')')))
        //console.log(testStr)
        //var jsonStr = JSON.parse(JsonStr)
        //console.log(jsonStr)
        res.render('adProductionComponentQC', {
            user: req.session.user,
            url:url,
            qcTable:qcTable,
            QCfomatJsonStr:QCfomatJsonStr
        });
    });


});




/*                            ****************************************领料记录增查******************************************                  */
//   ---添加领料记录---
//   ---查看领料记录---


/*                            ****************************************领料详细增查******************************************                  */
//   ---添加领料详细---
//   ---查看领料详细---


/*                            ****************************************排产部件增删改查******************************************                  */
//   ---添加部件---
//   ---删除部件---
//   ---修改部件---
//   ---查看部件---

/*                            ****************************************排产部件出入仓记录增查******************************************                  */
//   ---添加部件---
//   ---查看部件---


/*                            ****************************************主任务增删改查******************************************                  */
//   ---添加任务---
//   ---删除任务---
//   ---修改任务---
//   ---查看任务---

/*                            ****************************************子任务增删改查******************************************                  */
//   ---添加任务---
//   ---删除任务---
//   ---修改任务---
//   ---查看任务---



module.exports = router;