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


//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//
/*******************************  function  *********************************************/
function addNote(event,itemName,id,changedState){
    var saveDate= new Date();
    var year= saveDate.getFullYear();
    var month=saveDate.getMonth()+1;
    var day=saveDate.getDate();
    var hour=saveDate.getHours();
    var min=saveDate.getMinutes();
    var sec=saveDate.getSeconds();
    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;

    var addNoteSql='INSERT INTO homenote(date,event,itemName,id,changedState) VALUES (?,?,?,?,?)';
    var addNpteSqlParams=[dateOutput,event,itemName,id,changedState ];

    connection.query(addNoteSql,addNpteSqlParams,function (err, result) {
        if(err){
            console.log('[INSERT ERROR] - ',err.message);
        }
    });
}

// 更新部件成本函数
function updateComponentCost(componentId, itemId){
    if (itemId){
        let itemSql = 'SELECT componentId\n' +
            'FROM component\n' +
            'INNER JOIN component_has_item\n' +
            'ON component_has_item.component_componentId = component.componentId\n' +
            'INNER JOIN item\n' +
            'ON component_has_item.item_itemId = item.itemId AND component_has_item.item_itemModel = item.itemModel\n' +
            'WHERE itemId =' + '"' + itemId + '"' ;

        connection.query(itemSql, function (err,componentId) {
            if (err) {
                console.log('[SELECT ERROR] 查找部件错误！- ', err.message + '\n');
                return ('[SELECT ERROR] 查找部件错误！- ' + err.message + '\n');
            }
            for (let i=0;i<componentId.length;i++){
                updateComponentCost(componentId[i].componentId, false)
            }
        });
    }
    if (componentId){
        let componentSql = 'SELECT itemPrice, itemQuantity\n' +
            'FROM component\n' +
            'INNER JOIN component_has_item\n' +
            'ON component_has_item.component_componentId = component.componentId\n' +
            'INNER JOIN item\n' +
            'ON component_has_item.item_itemId = item.itemId AND component_has_item.item_itemModel = item.itemModel\n' +
            'WHERE componentId = ' + '"' + componentId + '"';
        connection.query(componentSql, function (err,cost) {
            if (err) {
                console.log('[SELECT ERROR] 查找部件成本错误！- ', err.message + '\n');
                return ('[SELECT ERROR] 查找部件成本错误！- ' + err.message + '\n');
            }
            var totalCost =0;
            for (let i=0;i<cost.length;i++){
                totalCost += cost[i].itemPrice * cost[i].itemQuantity;
            }
            let updateCostSql = 'UPDATE component SET cost = ? WHERE componentId =' + '"' + componentId + '"';
            let updateCostParams = [totalCost];
            connection.query(updateCostSql, updateCostParams, function (err) {
                if (err) {
                    console.log('[UPDATE ERROR] 更新部件成本错误！- ', err.message + '\n');
                    return ('[UPDATE ERROR] 更新部件成本错误！- ' + err.message + '\n');
                }
                let componentMachineSql = 'SELECT component.machineId\n' +
                    'FROM component\n' +
                    'INNER JOIN machine\n' +
                    'ON component.machineId = machine.machineId\n' +
                    'WHERE componentId = ' + '"' + componentId + '"';
                connection.query(componentMachineSql, function (err,machineIds) {
                    if (err) {
                        console.log('[SELECT ERROR] 查找部件设备错误！- ', err.message + '\n');
                        return ('[SELECT ERROR] 查找部件设备错误！- ' + err.message + '\n');
                    }
                    let machineId = machineIds[0].machineId;
                    updateMachineCost(machineId);
                });
            });
        });
    }

}

function updateMachineCost(machineId){
    let machineTotalCostSql = 'SELECT SUM(component.cost) AS machineTotalCost\n' +
        'FROM component\n' +
        'INNER JOIN machine\n' +
        'ON component.machineId = machine.machineId\n' +
        'WHERE component.machineId = ' + '"' + machineId + '"';
    connection.query(machineTotalCostSql, function (err,machineTotalCosts) {
        if (err) {
            console.log('[SELECT ERROR] 查找设备成本错误！- ', err.message + '\n');
            return ('[SELECT ERROR] 查找设备成本错误！- ' + err.message + '\n');
        }
        let machineTotalCost = machineTotalCosts[0].machineTotalCost
        if (!machineTotalCost){machineTotalCost = 0}
        let updateMachineSql = 'UPDATE machine SET machineCost = '+ '"' + machineTotalCost + '"' + 'WHERE machineId = ' + '"' + machineId + '"';
        connection.query(updateMachineSql, function (err) {
            if (err) {
                console.log('[SELECT ERROR] 更新设备成本错误！- ', err.message + '\n');
                return ('[SELECT ERROR] 更新设备成本错误！- ' + err.message + '\n');
            }
        });
    });
}

function copyComponent(componentId, componentName, componentModel, componentType, componentNote, componentFileName, machineId, userId, count){
    var saveDate, year, month, day, hour, min, sec, updateTime;
    saveDate = new Date();
    year = saveDate.getFullYear();
    month = saveDate.getMonth() + 1;
    day = saveDate.getDate();
    hour = saveDate.getHours();
    min = saveDate.getMinutes();
    sec = saveDate.getSeconds();
    updateTime = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;

    let componentSql = 'SELECT item_itemId, item_itemModel, itemQuantity, itemOrderBy, cost, componentFileName\n' +
        'FROM component\n' +
        'INNER JOIN component_has_item\n' +
        'ON component_has_item.component_componentId = component.componentId\n' +
        'WHERE componentId = ' + '"' + componentId + '";';
    connection.query( componentSql,function (err, componentItems) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }

        var newComponentCost = 0;

        if (componentItems.length > 0){
            newComponentCost = componentItems[0].cost;
            if (componentFileName === 'no-image-available.jpg'){
                componentFileName = componentItems[0].componentFileName
            }
        }

        let insertSql = 'INSERT INTO component(componentModel,componentName,updateTime,state,note,userId,categoryId,cost,componentFileName, machineId) VALUES(?,?,?,?,?,?,?,?,?,?)';
        let insertParam = [componentModel,componentName,updateTime,'正常',componentNote,userId,componentType,newComponentCost,componentFileName, machineId]
        connection.query( insertSql, insertParam,function (err) {
            if (err) {
                console.log('[INSERT ERROR] 添加复制部件错误！ - ', err.message);
                return;
            }
            updateMachineCost(machineId);
            let addSql = 'INSERT INTO component_has_item(component_componentId, item_itemId, item_itemModel, itemQuantity, itemOrderBy) VALUES(?,?,?,?,?)'
            connection.query( 'SELECT LAST_INSERT_ID() AS newComponentId;', function (err, newComponentIds) {
                if (err) {
                    console.log('查找插入ID错误！ - ', err.message);
                    return;
                }
                let newComponentId = newComponentIds[0].newComponentId - count;
                for (let i = 0; i < componentItems.length; i++) {
                    let itemId = componentItems[i].item_itemId;
                    let itemModel = componentItems[i].item_itemModel;
                    let itemQty = componentItems[i].itemQuantity;
                    let itemOrderBy = componentItems[i].itemOrderBy;
                    let addSqlParams = [newComponentId, itemId, itemModel, itemQty, itemOrderBy];
                    connection.query(addSql, addSqlParams, function (err) {
                        if (err) {
                            console.log('[INSERT ERROR] 从部件中添加物料错误！ - ', err.message);
                        }
                    });
                }
            });
        });

        // --添加事件更新到首页--
        // addNote('部件事件更新', componentName, componentModel, '添加新部件');
    });
}

function copyMachine(copyMachineId, machineName, machineModel, machineDesigner, machineNote, machineFileName){
    var saveDate, year, month, day, hour, min, sec, updateTime;
    saveDate = new Date();
    year = saveDate.getFullYear();
    month = saveDate.getMonth() + 1;
    day = saveDate.getDate();
    hour = saveDate.getHours();
    min = saveDate.getMinutes();
    sec = saveDate.getSeconds();
    updateTime = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;

    let copyMachineSql = 'SELECT *\n' +
        'FROM machine\n' +
        'INNER JOIN component\n' +
        'ON component.machineId = machine.machineId\n' +
        'INNER JOIN user\n' +
        'ON component.userId = user.userId\n' +
        'WHERE machine.machineId = ' + '"' + copyMachineId + '";';

    connection.query( copyMachineSql,function (err, machineComponents) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }

        if (machineFileName === 'no-image-available.jpg' && machineComponents){
            machineFileName = machineComponents[0].machineFileName;
        }

        let newMachineSql = 'INSERT INTO machine (machineId,machineName,updateTime,designer,note, machineFileName) VALUES(?,?,?,?,?,?)';
        let newMachineParams = [machineModel, machineName, updateTime, machineDesigner, machineNote, machineFileName];
        connection.query(newMachineSql, newMachineParams, function (err) {
            if (err) {
                console.log('[INSERT ERROR] 添加复制设备错误 - ', err.message);
                return;
            }
            // --添加事件更新到首页--
            addNote('设备事件更新', machineName, machineModel, '添加复制设备');

            var componentId, componentName, componentModel, componentType, componentNote, componentFileName, userId, i;
            for (i=0;i<machineComponents.length;i++){
                componentId = machineComponents[i].componentId;
                componentName = machineComponents[i].componentName;
                componentModel = machineComponents[i].componentModel;
                componentType = machineComponents[i].categoryId;
                componentNote = machineComponents[i].componentNote;
                componentFileName = machineComponents[i].componentFileName;
                userId = machineComponents[i].userId;
                copyComponent(componentId, componentName, componentModel, componentType, componentNote, componentFileName, machineModel, userId, i);
            }
        });
    });
}
//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//


//   ---查找设备---  A-B-C  设备，部件，物料
/* GET adBOMListMan */
router.get('/adBOMListMan', function(req, res) {
    let sql = 'SELECT * FROM machine;';
    let userSql = 'SELECT userName,role FROM user;';

    connection.query(sql,function (err,result0) {
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
            res.render('adBOMListMan', {
                user:req.session.user,
                machine: result0,
                users: users,
                searchResult:''
            });
        });
    });
});


//   ---搜索设备部件物料---  A-B-C  设备，部件，物料
/* POST adBOMListMan */
router.post('/adBOMListMan', function(req, res,){
    var sql;
    let searchText =  '\'\%%' + req.body.searchText + '%\'';
    let userSql = 'SELECT userName,role FROM user;';
    if(req.body.indexOfButton){
        sql='SELECT machine.machineId, machineName, machine.updateTime, designer, machineCost, machine.note\n' +
            'FROM machine\n' +
            'LEFT JOIN component\n' +
            'ON component.machineId = machine.machineId\n' +
            'LEFT JOIN component_has_item\n' +
            'ON component_has_item.component_componentId = component.componentId\n' +
            'LEFT JOIN item\n' +
            'ON component_has_item.item_itemId = item.itemId AND component_has_item.item_itemModel = item.itemModel\n' +
            'WHERE machine.machineId LIKE '+searchText+' OR machine.machineName LIKE '+searchText+' OR machine.note LIKE '+searchText+' OR componentModel LIKE '+searchText+' OR componentName LIKE '+searchText+' OR component.note LIKE '+searchText+' OR item.itemName LIKE '+searchText+' OR item.itemId LIKE '+searchText+'\n'+
            'GROUP BY machine.machineId;';
    }
    var searchResult=req.body.searchText;

    connection.query(sql,function (err,machine) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            res.send('搜索出错：' + '\n' + err);
            return;
        }
        connection.query(userSql,function (err, users) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                res.send(err);
                return;
            }
            res.render('adBOMListMan', {
                user:req.session.user,
                machine: machine,
                users: users,
                searchResult:searchResult
            });
        });

    });
});

//   ---查找设备部件---  A-B-C  设备，部件，物料
/* AJax get component List */
router.get('/ajaxComponents', function(req, res) {
    const machineId = req.query.machineId;
    const sql = 'SELECT componentId, componentModel, componentName, component.updateTime, component.note AS cNote, cost, userName\n' +
        'FROM component \n' +
        'INNER JOIN machine\n' +
        'ON component.machineId = machine.machineId\n' +
        'INNER JOIN user \n' +
        'ON component.userId = user.userId\n' +
        'WHERE component.machineId = ' + '"' + machineId + '"\n' +
        'ORDER BY categoryId'

    connection.query( sql,function (err, component) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        var HTMLText='';
        for(var j=0;j<component.length;j++){
            if (!component[j].cNote){component[j].cNote=''}
            HTMLText += '<table class="noteButton2" cellspacing="0" cellpadding="0" style="width: 122.5%; ">\n'+
                '                        <tr class="noteButton2" style="width: 87%;" id="'+machineId+'component'+j+'" >\n' +
                '                            <td style="width: 80%;">\n' +
                '                                <button class="noteButton2" name="componentBtn" id="'+machineId+component[j].componentId+'" value=0 style="padding-left: 80px;" type="button" onclick="showItems('+j+','+'\''+machineId+'\''+','+'\''+component[j].componentId+'\''+')">\n' +
                '                                    <div  style= "font-size: 0.7rem; height: 30px; ">\n' +
                '                                        <span class="componentInfo" style="margin-left: -60px;color: #0050fa;   ">部件&nbsp;'+parseInt(j+1)+'</span>\n' +
                '                                        <span class="componentInfo" style="margin-left: -20px">部件名称：<a style="font-weight: normal;color: #0050fa;">' + component[j].componentName + '</a></span>\n' +
                '                                        <span class="componentInfo" style="margin-left: 200px">制表人：<a style="font-weight:normal;color: #0050fa; ">' + component[j].userName + '</a></span>\n' +
                '                                        <span class="componentInfo" style="margin-left: 430px">更新日期：<a style="font-weight:normal;color: #0050fa; ">' + component[j].updateTime.getFullYear()+'-'+component[j].updateTime.getMonth()+1+'-'+component[j].updateTime.getDate()+ '</a></span>\n' +
                '                                    </div>\n' +
                '                                    <div  style= "font-size: 0.7rem; height: 30px; ">\n' +
                '                                        <span class="componentInfo" style="margin-left: -20px">部件型号：<a style="font-weight:normal;color: #0050fa; ">' + component[j].componentModel + '</a></span>\n' +
                '                                        <span class="componentInfo" id="'+machineId+'componentCostRow'+j+'" style="margin-left: 430px; display: none;">部件成本：<a style="font-weight:normal;color: #0050fa; ">' + component[j].cost + '</a></span>\n' +
                '                                            <style onload="Authority(\'系统管理员\',\''+machineId+'componentCostRow'+j+'\')"></style>\n' +
                '                                    </div>\n' +
                '                                    <div  style= "font-size: 0.7rem; height: 30px;" id="">\n' +
                '                                        <span class="componentInfo" style="margin-left: -20px" >备注：<a style="font-weight: normal;color: red;">' + component[j].cNote + '</a></span>\n' +
                '                                    </div>\n' +
                '                                </button>\n' +
                '                            </td>\n' +
                '                            <td style="width: 13%!important;">\n' +
                '<table  style="width: 100%">\n' +
                '                                <tr >\n' +
                '                                    <td>\n' +
                '                                        <button class="itemButton1" style="height: 90px;border: 0" type="button" onclick="location.href=\'/adBOMList?componentId=' + component[j].componentId + '\'"><img src=\'images/components.png\' height="50px" width="50px"></button>\n' +
                '                                    </td>\n' +
                '                                </tr>\n' +
                '                            </table> \n'+
                '                            </td>\n' +
                '                        </tr>\n'+


                '                                    <tr cellspacing="0" cellpadding="0" id="'+component[j].componentId+'itemBox'+'"  style="width: 100%">\n' +
                '                                    </tr>\n' +


                '</table>'
        }
        res.json({
            component:component,
            HTMLText:HTMLText
        });

    });
});

//   ---查找部件物料---  A-B-C  设备，部件，物料
/* AJax get item List */
router.get('/ajaxItems', function(req, res) {
    const componentId = req.query.componentId;
    const machineId = req.query.machineId;
    const sql = 'SELECT item.itemId, itemName, itemPrice, item.itemModel, itemArea, itemNote, itemQuantity, component.categoryId,  itemTypeName AS itemType, itemFileName\n' +
        'FROM component\n' +
        'INNER JOIN component_has_item\n' +
        'ON component_has_item.component_componentId = component.componentId\n' +
        'INNER JOIN item\n' +
        'ON component_has_item.item_itemId = item.itemId AND component_has_item.item_itemModel = item.itemModel\n' +
        'INNER JOIN category\n' +
        'ON component.categoryId = category.categoryId\n' +
        'INNER JOIN itemType\n' +
        'ON item.itemTypeId = itemtype.itemTypeId\n' +
        'INNER JOIN user\n' +
        'ON component.userId = user.userId\n' +
        'WHERE component.componentId = ' + '"' + componentId + '"\n' +
        'ORDER BY itemOrderBy, itemType';

    connection.query( sql,function (err, item) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        var HTMLText='';
        for(var j=0;j<item.length;j++){
            HTMLText +=  '<table cellspacing="0" cellpadding="0" style="width: 122.5%; ">\n'+
                '                        <tr class="noteButton3" id="'+machineId+componentId+'item'+j+'" style="width: 100%;" >\n' +
                '                            <td style="width: 87%; ">\n' +
                '                                <button class="noteButton3"  style="padding-left: 80px;" type="button" onclick="location.href=\'/adItem?itemId='+item[j].itemId+'&returnSql=\'+document.URL.split(\'sql=\')[1]">\n' +
                '                                    <div  style= "font-size: 0.7rem; height: 30px; margin-left: 50px ">\n' +
                '                                        <span class="itemInfo" style="margin-left: -90px;color: #0050fa;   ">物料&nbsp;'+parseInt(j+1)+'</span>\n' +
                '                                        <span class="itemInfo" style="margin-left: -50px">物料名称：<a style="font-weight: normal;color: #0050fa;">' + item[j].itemName + '</a></span>\n' +
                '                                        <span class="itemInfo" style="margin-left: 200px">物料编号：<a style="font-weight:normal;color: #0050fa; ">' + item[j].itemId + '</a></span>\n' +
                '                                        <span class="itemInfo" style="margin-left: 470px">区域：<a style="font-weight:normal;color: #0050fa; ">' + item[j].itemArea + '</a></span>\n' +
                '                                    </div>\n' +
                '                                    <div  style= "font-size: 0.7rem; height: 30px; margin-left: 50px ">\n' +
                '                                        <span class="itemInfo" style="margin-left: -50px">型号(图号)：<a style="font-weight:normal;color: #0050fa; ">' + item[j].itemId + '</a></span>\n' +
                '                                        <span class="itemInfo" style="margin-left: 250px">类别：<a style="font-weight:normal;color: #0050fa; ">' + item[j].itemType + '</a></span>\n' +
                '                                        <span class="itemInfo" id="'+machineId+componentId+'itemCostRow'+j+'" style="margin-left: 380px; display: none;">物料成本：<a style="font-weight:normal;color: #0050fa; ">' + item[j].itemPrice + '</a></span>\n' +
                '                                            <style onload="Authority(\'系统管理员\',\''+machineId+componentId+'itemCostRow'+j+'\')"></style>\n' +
                '                                    </div>\n' +
                '                                    <div  style= "font-size: 0.7rem; height: 30px; margin-left: 50px" id="">\n' +
                '                                        <span class="itemInfo" style="margin-left: -50px" >所需数量：<a style="font-weight: normal;color: #0050fa;">' + item[j].itemQuantity + '</a></span>\n' +
                '                                        <span class="itemInfo" style="margin-left: 80px">备注：<a style="font-weight:normal;color: #0050fa; ">' + item[j].itemNote + '</a></span>\n' +
                '                                    </div>\n' +
                '                                </button>\n' +
                '                            </td>\n' +
                '                            <td style="width: 13%;">\n' +
                '                                <table cellspacing="0" cellpadding="0" style="width: 100%">\n' +
                '                                    <tr style="width: 100%;">\n' +
                '                                            <button class="itemButton1" type="button" style="margin-left: -70px" onclick="window.open(\'uploads/'+item[j].itemFileName+'\')"><img src=\'images/checkDrawing.png\' height="37px" width="40px"></button>\n' +
                '</tr>\n'+
                '<tr>\n'+
                '                                            <button class="itemButton2" type="button" style="margin-left: -70px" onclick="window.open(\'/qrCodePrint?itemId='+item[j].itemId+'\')"><img src=\'images/checkQRcode.png\' height="23px" width="23px"></button>\n' +
                '                                    </tr>\n' +
                '                                </table>\n' +
                '                            </td>\n' +
                '                        </tr>\n'+
                '</table>'
        }

        res.json({
            item:item,
            HTMLText:HTMLText
        });
    });
});

/*                            ***************************************************设备增删改查***************************************************                  */
//   ---增加设备---
/* GET adBOMListMachineAdd */
router.get('/adBOMListMachineAdd', function(req, res) {
    let userSql = 'SELECT userName,role FROM user;'
    connection.query(userSql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        res.render('adBOMListMachineAdd', {
            user:req.session.user,
            users: result
        });
    });
});

/* POST adBOMListMachineAdd */
router.post('/adBOMListMachineAdd', upload.single('machineFileName'), function (req, res) {
    let saveDate = new Date();
    let year = saveDate.getFullYear();
    let month = saveDate.getMonth() + 1;
    let day = saveDate.getDate();
    let hour = saveDate.getHours();
    let min = saveDate.getMinutes();
    let sec = saveDate.getSeconds();
    let updateTime = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;

    let addMachineModel = req.body.addMachineModel;
    let addMachineName = req.body.addMachineName;
    let addMachineDesigner = req.body.addMachineDesigner;
    let addMachineNote = req.body.addMachineNote;

    var fileName;
    if (req.file){
        fileName=req.file.filename;
    } else {
        fileName = 'no-image-available.jpg';
    }
    // let addMachineDesigner = req.session.user.userName;
    addMachineModel = pinyin(addMachineModel, {style: pinyin.STYLE_FIRST_LETTER}).toString();
    addMachineModel = addMachineModel.replace(new RegExp(",", 'g'), "").toUpperCase();

    let unique = true;
    let checkMachineModelSql = 'SELECT * FROM machine WHERE machineId=\'' + addMachineModel + '\'';
    let checkMachineName = 'SELECT * FROM machine WHERE machineName=\'' + addMachineName + '\'';

    connection.query(checkMachineModelSql, function (err, result1) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        connection.query(checkMachineName, function (err, result2) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                res.send(err);
                return;
            }
            if (result1.length !== 0) {
                unique = false;
                return res.send('机械添加失败：您所添加的机械【机械型号】已存在于机械列表中。')
            } else if (result2.length !== 0) {
                unique = false;
                return res.send('机械添加失败：您所添加的机械【机械名称】已存在于机械列表中。')
            } else if (unique) {
                let addSql1 = 'INSERT INTO machine (machineId,machineName,updateTime,designer,note,machineFileName) VALUES(?,?,?,?,?,?)';
                let addSqlParams1 = [addMachineModel, addMachineName, updateTime, addMachineDesigner, addMachineNote,fileName];
                connection.query(addSql1, addSqlParams1, function (err) {
                    if (err) {
                        console.log('[INSERT ERROR] - ', err.message);
                        res.send(err);
                        return;
                    }
                    // --添加事件更新到首页--
                    addNote('设备事件更新', addMachineName, addMachineModel, '添加新设备');
                    res.redirect('/adBOMListMan');
                });
            }
        });
    });
});

//   ---删除设备---
/* GET adBOMListMachineDelete Page */
router.get('/adBOMListMachineDelete', function(req, res) {
    let url=URL.parse(req.url,true).query;
    let machineId = url.machineId;
    let checkMachineSql = 'SELECT machineName FROM machine WHERE machineId = '+'\''+machineId+'\'';
    let delMachineSql = 'DELETE FROM machine WHERE machineId = '+'\''+machineId+'\'';
    connection.query(checkMachineSql,function (err, machineName) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            res.send('adBOMListMachineDelete: 查看设备错误！' + err);
            return;
        }
        connection.query(delMachineSql,function (err) {
            if(err){
                console.log('[DELETE ERROR] - ',err.message);
                res.send('adBOMListMachineDelete: 删除设备错误！' + err);
                return;
            }
            // --添加事件更新到首页--
            addNote('设备事件更新', machineName[0].machineName, machineId, '删除设备');
            res.redirect('/adBOMListMan')
        });
    });
});

//   ---修改设备---
/* POST adBOMListMachineEdit Page */
router.post('/adBOMListMachineEdit', upload.single('machineFileName'), function(req, res) {
    let  saveDate= new Date();
    let year= saveDate.getFullYear();
    let month=saveDate.getMonth()+1;
    let day=saveDate.getDate();
    let hour=saveDate.getHours();
    let min=saveDate.getMinutes();
    let sec=saveDate.getSeconds();
    let updateTime= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;

    let MachineModel = req.body.MachineModel;
    let MachineName = req.body.MachineName;
    let MachineDesigner = req.body.MachineDesigner;
    let MachineNote = req.body.MachineNote;
    MachineModel=pinyin(MachineModel,{style:pinyin.STYLE_FIRST_LETTER}).toString();
    MachineModel=MachineModel.replace(new RegExp(",",'g'),"").toUpperCase();

    var machineFileName, modSql, modSqlParams, url, machineId;
    url = URL.parse(req.url,true).query;
    machineId = url.machineId;

    if (req.file){
        machineFileName = req.file.filename;
        modSql = 'UPDATE machine SET machineId = ?, machineName = ?, updateTime = ?, designer = ?, note = ?, machineFileName = ? WHERE machineId = '+'\''+machineId+'\'';
        modSqlParams = [MachineModel, MachineName, updateTime, MachineDesigner, MachineNote, machineFileName];
    } else {
        modSql = 'UPDATE machine SET machineId = ?, machineName = ?, updateTime = ?, designer = ?, note = ? WHERE machineId = '+'\''+machineId+'\'';
        modSqlParams = [MachineModel, MachineName, updateTime, MachineDesigner, MachineNote];
    }

    connection.query(modSql,modSqlParams,function (err) {
        if(err){
            console.log('[UPDATE ERROR] - ',err.message);
            res.send( '更新设备信息错误，请检查设备名称或设备型号是否已存在。 \n' + err);
            return;
        }
        // --添加事件更新到首页--
        addNote('设备事件更新', MachineName, MachineModel, '修改设备');
        res.redirect('/adBOMListMachineMan?machineId=' + MachineModel);

    });
});

//   ---查找部件设备--- 详细页
/* GET adBOMListMachineMan */
router.get('/adBOMListMachineMan', function (req, res) {
    let url = URL.parse(req.url, true).query;
    let machineId = url.machineId;
    // 设备有部件
    let machineComponentSql = 'SELECT machine.machineId, machineName, machine.updateTime AS mUpdateTime, machine.note AS mNote, designer, componentId, componentModel, componentName, component.updateTime AS cUpdateTime, component.note AS cNote, categoryName, cost As componentCost, machineFileName\n' +
        'FROM machine\n' +
        'INNER JOIN component\n' +
        'ON machine.machineId = component.machineId\n' +
        'INNER JOIN category\n' +
        'ON component.categoryId = category.categoryId\n' +
        'INNER JOIN user\n' +
        'ON component.userId = user.userId\n' +
        'WHERE machine.machineId =' + '\'' + machineId + '\'' + '\n' +
        'ORDER BY component.categoryId';

    // 设备无部件
    let machineSql = 'SELECT machineId, machineName, updateTime AS mUpdateTime, machine.note AS mNote, designer, machineFileName\n' +
        'FROM machine\n' +
        'INNER JOIN user\n' +
        'ON machine.designer = user.userName\n' +
        'WHERE machine.machineId =' + '\'' + machineId + '\'';
    let categorySql = 'SELECT * FROM category;';

    let userSql = 'SELECT userName,role FROM user;'
    connection.query(userSql,function (err, users) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }

        connection.query(categorySql, function (err, category) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                res.send(err);
                return;
            }
            connection.query(machineComponentSql, function (err, machineComponent) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    res.send(err);
                    return;
                }
                if (machineComponent.length === 0){
                    connection.query(machineSql, function (err, machine) {
                        if (err) {
                            console.log('[SELECT ERROR] - ', err.message);
                            res.send(err);
                            return;
                        }
                        if (machine.length === 0){
                            res.send("设备不存在!")
                        } else {
                            res.render('adBOMListMachineMan', {
                                user: req.session.user,
                                category: category,
                                machine: machine,
                                users: users
                            });
                        }
                    });
                }
                else {
                    res.render('adBOMListMachineMan', {
                        user: req.session.user,
                        category: category,
                        machine: machineComponent,
                        users: users
                    });
                }
            });
        });
    });
});

/*                            ***************************************************部件增删改查***************************************************                  */
//   ---从设备中增加部件---
/* GET adBOMListComponentAdd*/
router.get('/adBOMListComponentAdd', function(req, res) {
    var url, machineId, categorySql, machineSql, machineName;
    url = URL.parse(req.url,true).query;
    machineId = url.machineId;
    categorySql = 'SELECT categoryName FROM category;';
    machineSql = 'SELECT machineName FROM machine WHERE machineId = ' + '"' + machineId + '"' +';';

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
            res.render('adBOMListComponentAdd', {
                user:req.session.user,
                categoryName: categoryName,
                machineName: machineName,
                machineId: machineId
            });
        });
    });
});

/* POST adBOMListComponentAdd*/
router.post('/adBOMListComponentAdd', upload.single('BomListFileName'), function (req, res) {
    var saveDate, year, month, day, hour, min, sec, updateTime;
    saveDate = new Date();
    year = saveDate.getFullYear();
    month = saveDate.getMonth() + 1;
    day = saveDate.getDate();
    hour = saveDate.getHours();
    min = saveDate.getMinutes();
    sec = saveDate.getSeconds();
    updateTime = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;

    var addComponentName, addComponentModel, addComponentNote, addComponentType, designerId, fileName, addToMachineId;
    addComponentName = req.body.addComponentName;
    addComponentModel = req.body.addComponentModel;
    // let addComponentState = req.body.addComponentState;
    addComponentNote = req.body.addComponentNote;
    addComponentType = req.body.addComponentType;
    designerId = req.session.user.userId;
    addToMachineId = req.body.addToMachineId;

    if (req.file){
        fileName=req.file.filename;
    } else {
        fileName = 'no-image-available.jpg';
    }

    let categorySql = 'SELECT * FROM category WHERE categoryName = ' + '"' + addComponentType + '"';
    connection.query(categorySql, function (err, category) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send('查找类别出错：' + '\n' + err);
            return;
        }
        let categoryId = category[0].categoryId;
        let addSql = 'INSERT INTO component(componentModel,componentName,updateTime,state,note,userId,categoryId,cost,componentFileName, machineId) VALUES(?,?,?,?,?,?,?,?,?,?)';
        let addSqlParams = [addComponentModel, addComponentName, updateTime, "正常", addComponentNote, designerId, categoryId,0,fileName, addToMachineId];
        connection.query(addSql, addSqlParams, function (err) {
            if (err) {
                console.log('[INSERT ERROR] - ', err.message);
                res.send('添加错误, 检查部件图号是否重复' + err);
                return;
            }

            let lastIdSql = 'SELECT LAST_INSERT_ID() AS lastId';
            connection.query(lastIdSql, function (err, lastId) {
                // --添加事件更新到首页--
                addNote('部件事件更新', addComponentName + " " + addComponentModel, lastId[0].lastId , '添加新部件');

                res.redirect('/adBOMListMachineMan?machineId=' + addToMachineId);

                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    res.send(err);
                }
            });
        });
    });
});

//   ---从设备中删除部件---
/* GET adBOMListComponentDelete Page */
router.get('/adBOMListComponentDelete', function (req, res) {
    let url = URL.parse(req.url, true).query;
    let componentId = url.componentId;
    let delSql = 'DELETE FROM component WHERE componentId = ' + '\'' + componentId + '\'';
    let componentMachineSql = 'SELECT component.machineId\n' +
        'FROM component\n' +
        'INNER JOIN machine\n' +
        'ON component.machineId = machine.machineId\n' +
        'WHERE componentId = ' + '"' + componentId + '"';
    let componentSql = 'SELECT * FROM component WHERE componentId = ' + componentId + ';'

    connection.query(componentSql, function (err, component) {
        if (err) {
            console.log('[SELECT ERROR] 查找部件错误！- ', err.message + '\n');
            return ('[SELECT ERROR] 查找部件设备错误！- ' + err.message + '\n');
        }
        // --添加事件更新到首页--
        addNote('部件事件更新', component[0].componentName + " " + component[0].componentModel, componentId, '删除部件');
        res.redirect('/adBOMListMan')

        connection.query(componentMachineSql, function (err, machineIds) {
            if (err) {
                console.log('[SELECT ERROR] 查找部件设备错误！- ', err.message + '\n');
                return ('[SELECT ERROR] 查找部件设备错误！- ' + err.message + '\n');
            }
            let machineId = machineIds[0].machineId;
            connection.query(delSql, function (err) {
                if (err) {
                    console.log('[DELETE ERROR] - ', err.message);
                    res.send(err);
                    return;
                }
                // 更新设备成本
                updateMachineCost(machineId);
            });
        });
    });
});

//   ---修改部件---
/* POST adBOMList Page */
router.post('/adBOMList', upload.single('BomListFileName'), function(req, res) {
    var url=URL.parse(req.url,true).query;
    var componentId = url.componentId;
    var saveDate, year, month, day, hour, min, sec, updateTime;
    saveDate = new Date();
    year = saveDate.getFullYear();
    month = saveDate.getMonth() + 1;
    day = saveDate.getDate();
    hour = saveDate.getHours();
    min = saveDate.getMinutes();
    sec = saveDate.getSeconds();
    updateTime = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;

    var BomListName, BomListModel, BomListNote, BomListType, userId, componentFileName, modSql, modSqlParams;
    BomListName = req.body.BomListName;
    BomListModel = req.body.BomListModel;
    // let addComponentState = req.body.addComponentState;
    BomListNote = req.body.BomListNote;
    BomListType = req.body.BomListType;
    userId = req.session.user.userId;

    if (req.file){
        componentFileName = req.file.filename;
        modSql = 'UPDATE component SET componentModel = ?,  componentName = ?, updateTime = ?, userId = ?, note = ?, categoryId = ?, componentFileName = ? WHERE componentId = '+'\''+componentId+'\'';
        modSqlParams = [BomListModel, BomListName, updateTime, userId, BomListNote, BomListType, componentFileName];
    } else {
        modSql = 'UPDATE component SET componentModel = ?,  componentName = ?, updateTime = ?, userId = ?, note = ?, categoryId = ? WHERE componentId = '+'\''+componentId+'\'';
        modSqlParams = [BomListModel, BomListName, updateTime, userId, BomListNote, BomListType];
    }

    connection.query(modSql,modSqlParams,function (err) {
        if(err){
            console.log('[UPDATE ERROR] - ',err.message);
            res.send(err);
            return;
        }
        // --添加事件更新到首页--
        addNote('部件事件更新', BomListName + " " + BomListModel, componentId , '修改部件');
        res.redirect('/adBOMList?componentId=' + componentId);
    });

});


//   ---查找部件物料--- 详细页
/* GET adBOMList */
router.get('/adBOMList', function (req, res) {
    let url = URL.parse(req.url, true).query;
    // 部件有物料
    let componentItemSql = 'SELECT componentId, componentModel, componentName, component.updateTime, component.state, component.note, component.categoryId, category.categoryName, ' +
        'cost, componentFileName, userName, itemId, itemName, itemPrice, itemModel, itemTypeName AS itemType, itemNote, itemQuantity, machineName, machine.machineId\n' +
        'FROM component\n' +
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
    let componentSql = 'SELECT componentId, componentModel, componentName, component.updateTime, component.state, component.note, component.categoryId, category.categoryName, ' +
        'cost, componentFileName, userName, machineName, machine.machineId\n' +
        'FROM component\n' +
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
                                res.render('adBOMList', {
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
                        res.render('adBOMList', {
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


/*                            ***************************************************BOM表物料增删改查***************************************************                  */

/* AJax Search Item */
router.get('/ajaxSearchItem', function(req, res) {
    var searchText, searchSql;
    searchText = req.query.searchText;
    var searchTimes=req.query.searchTimes;
    searchText = '%' + searchText + '%';
    searchSql = 'SELECT itemId, itemModel, itemName, itemNote, itemTypeName AS itemType, itemNum, itemUnit, itemSupplier\n' +
        'FROM item\n' +
        'JOIN category ON category.categoryId = item.categoryId\n' +
        'INNER JOIN itemType\n' +
        'ON item.itemTypeId = itemtype.itemTypeId\n' +
        'WHERE itemId LIKE "'+ searchText + '" OR itemModel LIKE "'+ searchText + '" OR itemName LIKE "'+ searchText + '" OR itemSupplier LIKE "'+searchText+ '" OR itemNote LIKE "'+ searchText + '";'

    connection.query(searchSql,function (err, item) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send('搜索物料错误！' + err);
            return;
        }
        var HTMLText='';
        for(var j=0;j<item.length;j++){
            HTMLText += '<div id="itemSelectBox'+j+'">\n' +
                '    <table id="'+'Content'+j+searchTimes+'" class="noteButton" value="'+item[j].itemId+'"  style="width: 100%;height: 90px!important;">\n' +
                '        <tr  style="width: 100%">\n' +
                '            <td style="width: 87%">\n' +
                '                <button  class="noteButton" name="checkItemBtn" id="itemBtn"  style="padding-left: 10px; width: 100%" type="button" onclick="window.open(\'/adItem?itemId='+item[j].itemId+'&returnSql=\'+document.URL.split(\'sql=\')[1])">\n' +
                '                    <table  style="width: 100%;padding: 0px">\n' +
                '                        <tr style="padding: 0px">\n' +
                '                            <td   style="padding: 0px">\n' +
                '                                <table  style="width: 100%;padding: 0px">\n' +
                '                                    <tr id="1" style="width: 100%;padding: 0px">\n' +
                '                                        <td style="padding: 0px" >\n' +
                '                                            <div  style= "font-size: 0.7rem; height: 30px;width: 100% ">\n' +
                '                                                <span class="itemInfo" style="color: #0050fa;position: relative">#'+(j+1)+'</span>\n' +
                '                                                <span class="itemInfo" style="position: relative">名称：<a style="font-weight: normal;color: #0050fa; position: relative">【'+item[j].itemSupplier+'】'+item[j].itemName+'</a></span>\n' +
                '                                            </div>\n' +
                '                                        </td>\n' +
                '                                        <td id="'+'requiredNum'+j+searchTimes+'" style="display: none" >\n' +
                '                                            <div style="margin-left: 10px;">\n' +
                '                                                <span style=" font-weight: bold;color: #28a745">所需数量：<input id="itemQty" class="itemDetailsInput" name="'+'Input" required style="width: 80px;outline: none; padding-left: 10px; border-radius: 0.3rem; padding-bottom: 3px; border:1.8px solid #0050fa;background-color: rgb(232, 240, 254) !important;" ></span>\n' +
                '                                            </div>\n' +
                '                                        </td>\n' +
                '                                    </tr>\n' +
                '                                </table>\n' +
                '                                <table style="width: 100%;padding: 0px">\n' +
                '                                    <tr style="width: 100%;padding: 0px">\n' +
                '                                        <td style="padding: 0px" >\n' +
                '                                            <div  style= "font-size: 0.7rem; height: 30px; margin-left: 16px;width: 100%">\n' +
                '                                                <span class="itemInfo" style="position: relative;">物料编号：<a id="itemId" style="font-weight:normal;color: #0050fa; position: relative ">'+item[j].itemId+'</a></span>\n' +
                '                                            </div>\n' +
                '                                        </td>\n' +
                '                                        <td style="padding: 0px">\n' +
                '                                            <div  style= "font-size: 0.7rem; height: 30px; margin-left: 17px;width: 100%">\n' +
                '                                                <span class="itemInfo" style="position: relative;">型号（图号）：<a id="itemModel" style="font-weight:normal;color: #0050fa; position: relative ">'+item[j].itemModel+'</a></span>\n' +
                '                                            </div>\n' +
                '                                        </td>\n' +
                '                                    </tr>\n' +
                '                                </table>\n' +
                '                                <div  style= "font-size: 0.7rem; height: 30px;margin-left: 18px ">\n' +
                '                                    <span class="itemInfo" style="position: relative;">备注：<a style="font-weight:normal;color: red; position: relative ">'+item[j].itemNote+'</a></span>\n' +
                '                                </div>\n' +
                '                            </td>\n' +
                '                        </tr>\n' +
                '                    </table>\n' +
                '                </button>\n' +
                '            </td>\n' +
                '            <td id="'+'OperationBtnBox'+j+searchTimes+'" style="width: 13% ;padding: 0px">\n' +
                '                <button class="itemButton2" type="button" id="'+'OperationBtn'+j+searchTimes+'" onclick="selectItem(\'itemSelectBox'+j+'\',document.getElementById(this.id).parentNode.id,document.getElementById(this.id).parentNode.parentNode.firstElementChild.firstElementChild.firstElementChild.firstElementChild.firstElementChild.firstElementChild.firstElementChild.firstElementChild.firstElementChild.lastElementChild.id)" style="font-size: 0.7rem;height: 95px;"><img src=\'images/add.png\' height="30px" width="30px"></button>\n' +
                '            </td>\n' +
                '        </tr>\n' +
                '    </table>\n' +
                '</div>';
        }
        res.json({
            item:item,
            HTMLText:HTMLText
        });

    });
})



/* AJax Save ADD BOM List */
router.get('/ajaxSaveAdd', function(req, res) {
    const componentId = req.query.componentId;
    const items = req.query.items;
    const itemLength = items[0].length;
    var errorMessage;

    const maxOrderSql = 'SELECT itemOrderBy AS maxOrder FROM component_has_item WHERE component_componentId = ' + componentId;

    connection.query(maxOrderSql, function (err2, maxOrder) {

        if (err2) {
            console.log('[SELECT ERROR] 查找最大排序！- ', err2.message);
            errorMessage += '[SELECT ERROR] 查找最大排序！- ' + err2.message + '\n';
            return;
        }

        const addSql = 'INSERT INTO component_has_item(component_componentId, item_itemId, item_itemModel, itemQuantity, itemOrderBy) VALUES(?,?,?,?,?)'

        for (let i=0; i<itemLength; i++ ) {
            let itemId = items[0][i];
            let itemModel = items[1][i];
            let itemQty = items[2][i];

            let addOrderBy = maxOrder[0].maxOrder + i + 1;

            var addSqlParams = [componentId,itemId,itemModel,itemQty,addOrderBy];

            connection.query(addSql, addSqlParams, function (err) {
                if (err) {
                    console.log('[INSERT ERROR] 从部件中添加物料错误！- ', err.message);
                    errorMessage += '[INSERT ERROR] 从部件中添加物料错误！- ' + err.message + '\n';
                    return;
                }
                if (i === itemLength - 1) {
                    updateComponentCost(componentId, false);
                    if (errorMessage) {
                        console.log(errorMessage);
                        res.send(errorMessage);
                    } else {
                        res.send(false);
                    }
                }
            });
        }

    });
})

/* AJax Save DEL, Edit BOM List */
router.get('/ajaxSaveEdit', function(req, res) {
    var errorMessage;
    const componentId = req.query.componentId;
    let delSql = 'DELETE FROM component_has_item WHERE component_componentId =' + '"' + componentId + '"';
    connection.query(delSql, function (err) {
        if (err) {
            console.log('[DELETE ERROR] 从部件中移除物料错误！ - ', err.message);
        }
    });
    updateComponentCost(componentId,false);
    const items = req.query.items;
    var itemLength;
    if (items){
        itemLength = items[0].length;
    } else {
        res.send(false);
        return;
    }
    let addSql = 'INSERT INTO component_has_item(component_componentId, item_itemId, item_itemModel, itemQuantity, itemOrderBy) VALUES(?,?,?,?,?)'

    for (let i = 0; i < itemLength; i++) {
        let itemId = items[0][i]
        let itemModel = items[1][i]
        let itemQty = items[2][i]

        var addSqlParams = [componentId, itemId, itemModel, itemQty, i+1];

        connection.query(addSql, addSqlParams, function (err) {
            if (err) {
                console.log('[INSERT ERROR] 从部件中添加物料错误！ - ', err.message);
                errorMessage += '[INSERT ERROR] 从部件中添加物料错误！- ' + err.message + '\n';
            }
            if (i === itemLength - 1) {
                updateComponentCost(componentId, false);
                if (errorMessage) {
                    console.log(errorMessage)
                    res.send(errorMessage);
                } else {
                    res.send(false);
                }
            }
            // --添加事件更新到首页--
            // addNote('部件事件更新', componentId, componentId, '添修改部件');
        });
    }
})


/*                            ***************************************************分类增删改查***************************************************                  */
//   ---增加分类---
/* GET adBOMListCategoryAdd Page */
router.get('/adBOMListCategoryAdd', function(req, res) {
    res.render('adBOMListCategoryAdd', {user: req.session.user,})
});
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

//   ---查找分类---
/* GET adBOMListCategoryMan*/
router.get('/adBOMListCategoryMan', function(req, res) {
    let sql = 'SELECT * FROM category';
    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        res.render('adBOMListCategoryMan', {
            user: req.session.user,
            category: result
        })
    });
});


/*                            ***************************************************复制***************************************************                  */
//   ---复制部件---
/* POST componentCopy */
router.post('/componentCopy', upload.single('BomListFileName'), function(req, res) {
    let url=URL.parse(req.url,true).query;
    let componentId = url.componentId;
    var userId, componentName, componentModel, componentType, componentNote, componentFileName, machineId, machineIds, i;
    userId = req.session.user.userId;
    componentName = req.body.addComponentName;
    componentModel = req.body.addComponentModel;
    componentType = req.body.BomListType;
    componentNote = req.body.addComponentNote;
    machineIds = req.body.belongMachine;

    if (req.file){
        componentFileName = req.file.filename;
    } else {
        componentFileName = 'no-image-available.jpg';
    }

    // --添加事件更新到首页--
    addNote('部件事件更新', componentName + " " + componentModel, componentId ,'添加复制部件');

    if (Array.isArray(machineIds)){
        for (i=0; i<machineIds.length;i++) {
            machineId = machineIds[i];
            copyComponent(componentId, componentName, componentModel, componentType, componentNote, componentFileName, machineId, userId, i);
        }
    } else {
        copyComponent(componentId, componentName, componentModel, componentType, componentNote, componentFileName, machineIds, userId, 0);
    }

    let flashUrl = '/adBOMListMan';
    res.redirect('flash?url='+flashUrl);
});




//   ---复制机械---
/* POST machineCopy */
router.post('/machineCopy', upload.single('machineFileName'), function(req, res) {
    var userId, copyMachineId, machineName, machineModel, machineDesigner, machineNote, machineFileName, machineSql;
    copyMachineId = req.body.copyMachineModel;
    // userId = req.session.user.userId;
    machineName = req.body.addMachineName;
    machineModel = req.body.addMachineModel;
    machineDesigner = req.body.addMachineDesigner;
    machineNote = req.body.addMachineNote;

    if (req.file){
        machineFileName=req.file.filename;
    } else {
        machineFileName = 'no-image-available.jpg';
    }

    machineSql = 'SELECT * FROM machine;';
    connection.query(machineSql, function (err, machine) {
        if (err) {
            console.log('[INSERT ERROR] 添加复制设备错误 - ', err.message);
            return;
        }

        for (let i = 0; i < machine.length; i++) {
            if (machine[i].machineName === machineName) {
                res.send('已存在设备 ' + machineName + '， 请重新输入设备名称！');
                return;
            } else if (machine[i].machineId.toUpperCase() === machineModel.toUpperCase()) {
                res.send('已存在设备 ' + machineModel + '， 请重新输入设备型号！');
                return;
            }
        }

        copyMachine(copyMachineId, machineName, machineModel, machineDesigner, machineNote, machineFileName);

        let flashUrl = '/adBOMListMan';
        res.redirect('flash?url='+flashUrl);
    });
});



module.exports = router;