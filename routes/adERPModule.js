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
//=========文件上传参数

// -----测试upload文件夹分开放
// var storage2 = multer.diskStorage({
//     destination: function(req, file, cb) {
//         // 接收到文件后输出的保存路径（若不存在则需要创建）
//         cb(null, './public/components');
//     },
//     filename: function(req, file, cb) {
//         var fileName='';
//
//         if(req.body.updateFileName!==undefined){
//             fileName=file.originalname;
//         }
//         // 将保存文件名设置为 时间戳 + 文件原始名，比如 151342376785-123.jpg
//         cb(null, file.originalname );
//     }
// });
//
// var upload2 = multer({
//     storage: storage,
// });

//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//
/*******************************  function  *********************************************/
function getInfo(url,callback){
    router.get('/create_qrcode', function (req, res, next) {
        var text = req.query.text;
        try {
            var img = qr.image(text, {size: 10});
            res.writeHead(200, {'Content-Type': 'image/png'});
            img.pipe(res);
        } catch (e) {
            res.writeHead(414, {'Content-Type': 'text/html'});
            res.end('<h1>414 Request-URI Too Large</h1>');
        }
    });

    var statesCounter;
    var states=[];
    var statesList=[];
    // var sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId='+'\''+url.itemId+'\'';
    var sql='SELECT * FROM item JOIN itemstate ON item.itemId = itemstate.itemId JOIN itemtype ON item.itemTypeId = itemType.itemTypeId where item.itemId=itemstate.itemId AND item.itemId='+'\''+url.itemId+'\'';

    if (url.orderId) {
        if (url.orderId.toString().substring(0,3) === 'ONE'){
            sql = 'SELECT * \n' +
                'FROM orderlist\n' +
                'JOIN item_one\n' +
                'ON orderlist.orderId = item_one.orderId\n' +
                'WHERE orderlist.orderId = ' + '"' + url.orderId + '";';
        }
    }


    connection.query( sql, function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }


            states=[];
            statesCounter=-1;
            if(result[0].hasOrder===1){
                statesCounter++;
                states[statesCounter]='有订单未处理';
            }
            if(result[0].lessRest===1){
                statesCounter++;
                states[statesCounter]='少剩余';
            }
            if(result[0].hasUncheck===1){
                statesCounter++;
                states[statesCounter]='存在未检测'
            }
        if(result[0].needReturn===1){
            statesCounter++;
            states[statesCounter]='需归还物料'
        }
            statesList=states;


        if( states.length===0){
            statesCounter++;
            states[statesCounter]='无'
        }


        var finalresult={
            item:result[0],
            itemStateList:statesList,
        };

        callback(sql,finalresult)

    });

}

function ChangeState(judge,stateName,state,url) {
   // console.log(judge)
    if(judge){

        var modSql = 'UPDATE itemstate SET '+ stateName+' = ? WHERE itemId = '+'\''+url.itemId+'\'';
        var updateNum=state;

        var modSqlParams = [updateNum];
        connection.query(modSql,modSqlParams,function (err, result) {
            if(err){
                console.log('[UPDATE ERROR] - ',err.message);
                return;
            }

        });

    }
}

function addNote(event,itemName,id,changedState){
    var  saveDate= new Date();
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
//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//


/* GET home page. */
router.get('/adminHome', function(req, res, next) {
    // var  saveDate= new Date();
    // var year= saveDate.getFullYear();
    // var month=saveDate.getMonth()+1;
    // var day2=saveDate.getDate()-2;
    // var dateOutput= year+'-'+month+'-'+day2;
    //
    // var sql='SELECT * FROM homenote WHERE date > '+'"'+dateOutput+'"'+' ORDER BY date DESC';
    //
    // connection.query( sql,function (err, result) {
    //     if (err) {
    //         console.log('[SELECT ERROR] - ', err.message);
    //     }
        //console.log(result)
        res.render('adminHome', {
            // noteList: result,
            user:req.session.user
        });
    // })
});


router.get('/AjaxFetchHomeNote', function(req, res) {
    const limit = req.query.limit;
    const start = req.query.start;

    let sql='SELECT * FROM homenote ORDER BY date DESC LIMIT ' + start + ',' + limit;

    // console.log('sql: ' + sql);

    var sColor;
    function StateColorChange(state) {

        if(state==='少剩余'||state==='已拒绝'||state.includes('取消')    || state.substring(0,2) ==='删除'){
            sColor='red';
        }
        else if(state==='有订单未处理'||state==='有退回'){
            sColor='#fe007b';
        }
        else if(state==='存在未检测'||state==='申请中'){
            sColor='orange';
        }
        else if(state==='需归还物料'){
            sColor='#80d5d7';
        }
        else if(state==='无'||state==='已完成'){
            sColor='gray';
        }
        else if(state==='已下单'||state==='已到货'    || state.substring(0,2) === '修改'){
            sColor='green';
        } else if(state.substring(0,2) === '添加'){
            sColor='#00cb46';
        }

        return sColor;
    }

    function getURL(event, id, state) {
        var url;
        if (event === '物料事件更新') {
            url = "'/adItem?itemId=" + id + "&returnSql=undefined'";
        } else if (event === '采购事件更新') {
            url = "'/adOrder?orderId=" + id + "'";
        } else if (event === '设备事件更新' && state.toString().substring(0,2) !== '删除') {
            url = "'/adBOMListMachineMan?machineId=" + id + "'";
        } else if (event === '部件事件更新' && state.toString().substring(0,2) !== '删除') {
            url = "'/adBOMList?componentId=" + id + "'";
        } else {
            return "";
        }
        return "location.href=" + url;
    }

    connection.query( sql,function (err, noteList) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        var HTMLText='';
        for(let i = 0; i < noteList.length ;i++){

            let noteListDate = '';
            noteListDate += noteList[i].date.getFullYear();
            noteListDate += "-";
            noteListDate += noteList[i].date.getMonth()+1;
            noteListDate += "-";
            noteListDate += noteList[i].date.getDate();
            noteListDate += " ";
            noteListDate += noteList[i].date.getHours();
            noteListDate += ":";
            noteListDate += noteList[i].date.getMinutes();
            noteListDate += ":";
            noteListDate += noteList[i].date.getSeconds();

            let state = noteList[i].changedState;
            let sColor = StateColorChange(state);

            let id = noteList[i].id;
            let event =  noteList[i].event;
            let jumpURL = getURL(event, id, state);

            HTMLText +=
                '                    <div style="margin-left: -50px;font-size: 1rem;margin-top: 5px">\n' +
                '                        <button class="noteButton" style="padding-left:150px; " onclick="'+jumpURL+'">\n' +
                '                            <div  style= "size: 1rem; height: 40px;">\n' +
                '                                <span style="font-size: 0.8rem;position: absolute">' + noteListDate + '</span>\n' +
                '                                <span style="margin-left: 175px;position: absolute"><img src=\'images/RecentPoint.png\' height="40px" width="35px"></span>\n' +
                '                                <span id="event' + i + '" style="margin-left: 250px;">' + noteList[i].event + '</span>\n' +
                '                            </div>\n' +
                '                            <div style="margin-left: 190px;height: 18px">\n' +
                '                                <span style="line-height: 10px;"><img src=\'images/timeLine.png\' height="100%" width="10px"></span>\n' +
                '                            </div>\n' +
                '                            <div style="height: 18.5px">\n' +
                '                                <span style="margin-left: 190px"><img src=\'images/timeLine.png\' height="100%" width="10px"></span>\n' +
                '                                <span style="font-size: 0.8rem;margin-left: 45px;line-height: 10%;position: absolute">【<a style="color: blue">' + noteList[i].itemName + '</a>:&emsp;' + noteList[i].id + '】' +
                '                                                                                                                       :<a style="font-weight: bolder; color:'+sColor+'">' + state + '</a></span>\n' +
                '                            </div>\n' +
                '                            <div style="height: 19px">\n' +
                '                                <span style="margin-left: 190px;"><img src=\'images/timeLine.png\' height="100%" width="10px"></span>\n' +
                '                            </div>\n' +
                '                        </button>\n' +
                '                    </div>'
        }

        res.send(HTMLText);
    })

});

router.get('/', function(req, res, next) {
    res.redirect('/adminHome')
});

/* GET home itemManPage. */
router.get('/adItemMan', function(req, res, next) {
    var statesCounter;
    var states=[];
    var statesList=[];
    var sql='SELECT *,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0 THEN 1\n' +
            'END AS order_param \n' +
            'FROM itemstate, item\n' +
            'INNER JOIN itemType\n' +
            'ON item.itemTypeId = itemtype.itemTypeId\n' +
            'WHERE itemstate.itemId=item.itemId\n' +
            'ORDER BY  order_param,item.itemName ASC ';

    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        for(var i=0;i<result.length;i++){
            states=[];
            statesCounter=-1;
            if(result[i].hasOrder===1){
                statesCounter++;
                states[statesCounter]='有订单未处理';
            }
            if(result[i].lessRest===1){
                statesCounter++;
                states[statesCounter]='少剩余';
            }
            if(result[i].hasUncheck===1){
                statesCounter++;
                states[statesCounter]='存在未检测'
            }
            if(result[i].needReturn===1){
                statesCounter++;
                states[statesCounter]='需归还物料'
            }
            if(result[i].hasOrder===0&&result[i].lessRest===0&&result[i].hasUncheck===0&&result[i].needReturn===0){
                statesCounter++;
                states[statesCounter]='无'
            }
            statesList[i]=states;
        }

        let itemTypeSql = 'SELECT * FROM itemtype;';
        connection.query(itemTypeSql,function (err, itemType) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }

            res.render('adItemMan', {
                itemList:result,
                itemStateList:statesList,
                user:req.session.user,
                itemType:itemType
            });

        });

    });
});




router.post('/adItemMan', function(req, res,){
    var typeJudge=req.body.type;
    var alarmJudge=req.body.alarm;
    let indexOf =  '\'\%%' + req.body.indexOf + '%\'';
    var sql;

    if(req.body.indexOfButton){
        sql =   'SELECT *, CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND itemstate.needReturn = 0  THEN 1\n' +
                'END AS order_param \n ' +
                'FROM itemstate, item\n' +
                'INNER JOIN itemType\n' +
                'ON item.itemTypeId = itemtype.itemTypeId\n' +
                'WHERE itemstate.itemId=item.itemId AND (item.itemName Like' +indexOf+' OR item.itemId Like '+indexOf+' OR item.itemModel Like '+indexOf+' OR item.itemSupplier Like '+indexOf+' OR item.itemArea Like '+indexOf+' OR item.itemNote Like '+indexOf+')' +
                'ORDER BY  order_param,item.itemName ASC';
    } else if (typeJudge !== "all" && typeJudge !== undefined){
        sql =   'SELECT *, CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0  THEN 1\n' +
                'END AS order_param \n' +
                'FROM itemstate, item\n' +
                'INNER JOIN itemType\n' +
                'ON item.itemTypeId = itemtype.itemTypeId\n' +
                'WHERE itemstate.itemId=item.itemId AND itemTypeName ="' + typeJudge + '"\n' +
                'ORDER BY  order_param,item.itemId,itemArea ASC'
    } else{
        switch (alarmJudge) {
            case '1':  sql='SELECT * FROM item\n' +
                'JOIN itemstate ON item.itemId=itemstate.itemId\n' +
                'JOIN itemtype ON item.itemTypeId = itemtype.itemTypeId\n' +
                'WHERE itemstate.hasOrder=0 AND itemstate.lessRest=0 AND itemstate.hasUncheck=0 AND itemstate.needReturn = 0  ORDER BY item.itemId,item.itemArea'; break;

            case '2':  sql='SELECT * FROM item\n' +
                'JOIN itemstate ON item.itemId=itemstate.itemId\n' +
                'JOIN itemtype ON item.itemTypeId = itemtype.itemTypeId\n' +
                'WHERE itemstate.hasUncheck=1 ORDER BY item.itemId,item.itemArea'; break;

            case '3':  sql='SELECT * FROM item\n' +
                'JOIN itemstate ON item.itemId=itemstate.itemId\n' +
                'JOIN itemtype ON item.itemTypeId = itemtype.itemTypeId\n' +
                'WHERE itemstate.lessRest=1 ORDER BY item.itemId,item.itemArea'; break;

            case '4':  sql='SELECT * FROM item\n' +
                'JOIN itemstate ON item.itemId=itemstate.itemId\n' +
                'JOIN itemtype ON item.itemTypeId = itemtype.itemTypeId\n' +
                'WHERE itemstate.hasOrder=1 ORDER BY item.itemId,item.itemArea'; break;

            case '5':  sql='SELECT * FROM item\n' +
                'JOIN itemstate ON item.itemId=itemstate.itemId\n' +
                'JOIN itemtype ON item.itemTypeId = itemtype.itemTypeId\n' +
                'WHERE itemstate.needReturn=1 ORDER BY item.itemId,item.itemArea'; break;

            default :
                sql=    'SELECT *,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0  THEN 1\n' +
                        'END AS order_param \n ' +
                        'FROM itemstate, item\n' +
                        'INNER JOIN itemType\n' +
                        'ON item.itemTypeId = itemtype.itemTypeId\n' +
                        'WHERE itemstate.itemId=item.itemId\n' +
                        'ORDER BY  order_param,item.itemId,itemArea ASC'
        }
    }

    var statesCounter;
    var states=[];
    var statesList=[];
    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        for(var i=0;i<result.length;i++){
            states=[];
            statesCounter=-1;
            if(result[i].hasOrder===1){
                statesCounter++;
                states[statesCounter]='有订单未处理';
            }
            if(result[i].lessRest===1){
                statesCounter++;
                states[statesCounter]='少剩余';
            }
            if(result[i].hasUncheck===1){
                statesCounter++;
                states[statesCounter]='存在未检测'
            }
            if(result[i].needReturn===1){
                statesCounter++;
                states[statesCounter]='需归还物料'
            }
            if(result[i].hasOrder===0&&result[i].lessRest===0&&result[i].hasUncheck===0&&result[i].needReturn===0){
                statesCounter++;
                states[statesCounter]='无'
            }
            statesList[i]=states;
        }

        let itemTypeSql = 'SELECT * FROM itemtype;';
        connection.query(itemTypeSql,function (err, itemType) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }

            res.render('adItemMan', {
                itemList:result,
                itemStateList:statesList,
                user:req.session.user,
                itemType:itemType
            });

        });

    });

});




/* GET  itemPage. */
router.get('/adItem', function(req, res, next) {
    var statesCounter;
    var states=[];
    var statesList=[];
    var url=URL.parse(req.url,true).query;
    var sql1 =  'SELECT * FROM item \n' +
        'JOIN itemstate ON item.itemId=itemstate.itemId\n' +
        'JOIN itemtype ON item.itemTypeId = itemtype.itemTypeId\n' +
        'WHERE item.itemId = "' + url.itemId + '";\n'

    var sql2 =  'SELECT * FROM item \n' +
                'JOIN itemstate ON item.itemId=itemstate.itemId\n' +
                'JOIN itemtype ON item.itemTypeId = itemtype.itemTypeId\n' +
                'JOIN record ON item.itemId = record.itemId\n' +
                'WHERE item.itemId = "' + url.itemId + '"\n' +
                'ORDER BY date DESC;';

    var sql = sql1 + sql2;

    router.get('/create_qrcode', function (req, res, next) {
        var text = req.query.text;
        try {
            var img = qr.image(text, {size: 10});
            res.writeHead(200, {'Content-Type': 'image/png'});
            img.pipe(res);
        } catch (e) {
            res.writeHead(414, {'Content-Type': 'text/html'});
            res.end('<h1>414 Request-URI Too Large</h1>');
        }
    });

    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        for(var i=0;i<result[0].length;i++){
            states=[];
            statesCounter=-1;
            if(result[0][i].hasOrder===1){
                statesCounter++;
                states[statesCounter]='有订单未处理';
            }
            if(result[0][i].lessRest===1){
                statesCounter++;
                states[statesCounter]='少剩余';
            }
            if(result[0][i].hasUncheck===1){
                statesCounter++;
                states[statesCounter]='存在未检测'
            }
            if(result[0][i].needReturn===1){
                statesCounter++;
                states[statesCounter]='需归还物料'
            }
            statesList[i]=states;
        }

        if( states.length===0){
            statesCounter++;
            states[statesCounter]='无'
        }

        var  sql3 = 'SELECT * FROM item \n' +
                    'JOIN itemstate ON item.itemId=itemstate.itemId\n' +
                    'WHERE item.itemId = "' + url.itemId + '";';

        connection.query(sql3,function (err, result) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
                return;
            }
            ChangeState(result[0].itemNum>result[0].itemAlarmSetting,'lessRest',0,url);
            if(result[0].itemNum>result[0].itemAlarmSetting&&result[0].lessRest===1){
                addNote('物料事件更新',result[0].itemName,result[0].itemId,'取消少剩余状态');
            }

            ChangeState(result[0].itemNum<=result[0].itemAlarmSetting,'lessRest',1,url);
            if(result[0].itemNum<=result[0].itemAlarmSetting&&result[0].lessRest===0){
                addNote('物料事件更新',result[0].itemName,result[0].itemId,'少剩余');
            }
        });

        let itemTypeSql = 'SELECT * FROM itemtype;';
        connection.query(itemTypeSql,function (err, itemTypes) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }

            res.render('adItem', {
                item:result[0],
                itemStateList:statesList,
                recordList:result[1],
                user:req.session.user,
                itemTypes : itemTypes
            });

        });
    });

});


//如果一直出现500报错信息 Node Multer unexpected field 则需要如此操作

router.post('/adItem', upload.single('updateFileName'), function(req, res, next) {

    var url=URL.parse(req.url,true).query;
    var sql = '';
    //console.log(URL.parse(req.url,true).query);
    var typeJudge=req.body.type;
    let indexOf = '\'%' +'\\'+ req.body.date  + '%\'';
    var checkOriginalSql='SELECT * FROM item WHERE itemId = \''+url.itemId+'\'';

    var originalSql1;
    var updateJson1;
    var originalSql2='UPDATE itemstate SET  itemId=? WHERE itemId = \''+url.itemId+'\'';
    var originalSql3='UPDATE record SET  itemId=? WHERE itemId = \''+url.itemId+'\'';
    var originalSql4;
    var originalSql5;
    var originalSql6;


    var uploadFileName=req.body.updateFileName;
    //console.log(uploadFileName)

    var updateJson2=[req.body.updateId];


    var isUpdate=true;


    if(req.body.updateButton){

            //console.log(req.body.updateId.placeholder)

        var checkItemIdSQL='SELECT * FROM item WHERE itemId=\''+req.body.updateId+'\'';
        var checkItemModelSQL='SELECT * FROM item WHERE itemModel=\''+req.body.updateModel+'\'';
        //var bodyJason=[req.body.updateSupplier,req.body.updateName,req.body.updateId,req.body.updateModel,req.body.updateType];
        //console.log(bodyJason)
        connection.query(checkOriginalSql,function (err, result0) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                return;
            }
            connection.query(checkItemIdSQL,function (err, result1) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                connection.query(checkItemModelSQL, function (err, result2) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                        return;
                    }

                    var updatesupplierFinal=req.body.updateSupplier;
                    if(updatesupplierFinal===undefined){
                        updatesupplierFinal=result0[0].itemSupplier;
                    }

                    var updateTypeFinal=req.body.updateType;
                    if(updateTypeFinal===undefined){
                        updateTypeFinal=result0[0].itemTypeId;
                    }

                    if(req.body.updateId===undefined){
                        if(req.file===undefined){//仓管编辑
                            originalSql1='UPDATE item SET itemName=?, itemId=?, itemTypeId=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=? , itemSupplier=?, itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                            updateJson1=[result0[0].itemName,result0[0].itemId,updateTypeFinal,req.body.updateArea,req.body.updateAlarmSetting,req.body.updateNote,result0[0].itemModel,updatesupplierFinal,req.body.updateUnit];
                            if(req.body.updateArea===undefined){  //技术员编辑
                                originalSql1='UPDATE item SET itemName=?, itemId=?, itemTypeId=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=? , itemSupplier=?, itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                                updateJson1=[req.body.updateName,result0[0].itemId,updateTypeFinal,result0[0].itemArea,result0[0].itemAlarmSetting,req.body.updateNote,req.body.updateModel,updatesupplierFinal,result0[0].itemUnit];
                            }
                        }else{
                            originalSql1='UPDATE item SET itemName=?, itemId=?, itemTypeId=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=?, itemFileName=?, itemSupplier=? ,itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                            updateJson1=[result0[0].itemName,result0[0].itemId,updateTypeFinal,req.body.updateArea,req.body.updateAlarmSetting,req.body.updateNote,result0[0].itemModel,req.file.filename,updatesupplierFinal,req.body.updateUnit];
                            if(req.body.updateArea===undefined){
                                originalSql1='UPDATE item SET itemName=?, itemId=?, itemTypeId=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=?, itemFileName=?, itemSupplier=? ,itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                                updateJson1=[result0[0].itemName,result0[0].itemId,updateTypeFinal,result0[0].itemArea,result0[0].itemAlarmSetting,req.body.updateNote,req.body.updateModel,req.file.filename,updatesupplierFinal,result0[0].itemUnit];

                            }
                        }
                    }else{
                        if(req.file===undefined){//系统管理员编辑
                            originalSql1='UPDATE item SET itemName=?, itemId=?, itemTypeId=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=?,itemSupplier=?,itemUnit=?, itemPrice=? WHERE itemId = \''+url.itemId+'\'';
                            updateJson1=[req.body.updateName,req.body.updateId,updateTypeFinal,req.body.updateArea,req.body.updateAlarmSetting,req.body.updateNote,req.body.updateModel,updatesupplierFinal,req.body.updateUnit,req.body.updatePrice];
                        }else{
                            originalSql1='UPDATE item SET itemName=?, itemId=?, itemTypeId=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=?, itemFileName=?,itemSupplier=?,itemUnit=?, itemPrice=? WHERE itemId = \''+url.itemId+'\'';
                            updateJson1=[req.body.updateName,req.body.updateId,updateTypeFinal,req.body.updateArea,req.body.updateAlarmSetting,req.body.updateNote,req.body.updateModel,req.file.filename,updatesupplierFinal,req.body.updateUnit,req.body.updatePrice];
                        }
                        originalSql4='SET SQL_SAFE_UPDATES = 0;\n' +
                            'update homenote set id=(case when id=\''+url.itemId+'\' then \''+req.body.updateId+'\' end) where id=\''+url.itemId+'\';\n' ;
                        originalSql5='SET SQL_SAFE_UPDATES = 0;\n' +
                            'update notification set itemId=(case when itemId=\''+url.itemId+'\' then \''+req.body.updateId+'\' end) where itemId=\''+url.itemId+'\';\n';
                        originalSql6='SET SQL_SAFE_UPDATES = 0;\n' +
                            'update orderlist set itemId=(case when itemId=\''+url.itemId+'\' then \''+req.body.updateId+'\' end) where itemId=\''+url.itemId+'\';\n' ;
                    }


                    if (result1.length !== 0&&req.body.updateId!==url.itemId) {
                        isUpdate=false;
                        return res.send('数据更新失败：您正更改的物料【物料编号】已存在于物料列表中。')
                    } else if (result2.length !== 0&&req.body.updateModel!==url.itemModel) {
                        isUpdate=false;
                        return res.send('数据更新失败：您正更改的物料【型号(图号)】已存在于物料列表中。')
                    }else{
                        if( isUpdate){
                            connection.query(originalSql1,updateJson1,function (err, result) {
                                if(err){
                                    console.log('[UPDATE ERROR] - ',err.message);
                                    return ;
                                }
                            });

                            if(req.body.updateId!==undefined){
                                connection.query(originalSql2,updateJson2,function (err, result) {
                                    if(err){
                                        console.log('[UPDATE ERROR] - ',err.message);
                                        return ;
                                    }
                                });

                                connection.query(originalSql3,updateJson2,function (err, result) {
                                    if(err){
                                        console.log('[UPDATE ERROR] - ',err.message);
                                        return ;
                                    }
                                });
                                connection.query(originalSql4,function (err, result) {
                                    if(err){
                                        console.log('[UPDATE ERROR] - ',err.message);
                                        return ;
                                    }
                                });
                                connection.query(originalSql5,function (err, result) {
                                    if(err){
                                        console.log('[UPDATE ERROR] - ',err.message);
                                        return ;
                                    }
                                });
                                connection.query(originalSql6,function (err, result) {
                                    if(err){
                                        console.log('[UPDATE ERROR] - ',err.message);
                                        return ;
                                    }
                                });


                            }

                            //更新部件成本
                            updateComponentCost(false,url.itemId);


                            if(req.body.updateModel===undefined&&req.body.updateId===undefined){
                                var flashUrl='adItem?itemId='+url.itemId+'&returnSql='+url.returnSql+'&itemModel='+url.itemModel;
                            }else if(req.body.updateModel!==undefined&&req.body.updateId===undefined){
                                var flashUrl='adItem?itemId='+url.itemId+'&returnSql='+url.returnSql+'&itemModel='+req.body.updateModel;
                            }
                            else{
                                var flashUrl='adItem?itemId='+req.body.updateId+'&returnSql='+url.returnSql+'&itemModel='+req.body.updateModel;
                            }
                            res.redirect(flashUrl)
                        }
                    }
                });
            });
        });







    }else {
        switch (typeJudge) {
            case '0':
                sql = 'SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\'' + url.itemId + '\';SELECT * FROM record WHERE itemId=\'' + url.itemId + '\'' + 'ORDER BY date DESC';
                break;
            case '1':
                sql = 'SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\'' + url.itemId + '\';SELECT * FROM record WHERE itemId=\'' + url.itemId + '\' AND type=\'进仓\'' + 'ORDER BY date DESC';
                break;
            case '2':
                sql = 'SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\'' + url.itemId + '\';SELECT * FROM record WHERE itemId=\'' + url.itemId + '\' AND type=\'出仓\'' + 'ORDER BY date DESC';
                break;
            case '3':
                sql = 'SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\'' + url.itemId + '\';SELECT * FROM record WHERE itemId=\'' + url.itemId + '\' AND type=\'临时进仓\'' + 'ORDER BY date DESC';
                break;
            case '4':
                sql = 'SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\'' + url.itemId + '\';SELECT * FROM record WHERE itemId=\'' + url.itemId + '\' AND type=\'归还进仓\'' + 'ORDER BY date DESC';
                break;
        }


        //console.log(indexOf);

        if (req.body.dateButton) {
            sql = 'SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\'' + url.itemId + '\';SELECT * FROM record WHERE itemId=\'' + url.itemId + '\'AND date LIKE' + indexOf + 'ORDER BY date DESC';
        }


        let itemOrderListSql = sql;
        // var returnURL = '/adItem?sql=' + sql + '&itemId=' + url.itemId + '&returnSql=' + url.returnSql + '&itemModel=' + url.itemModel;
        // //console.log(returnURL);
        // return res.redirect(returnURL)

        var statesCounter;
        var states = [];
        var statesList = [];
        var sql1 = 'SELECT * FROM item \n' +
            'JOIN itemstate ON item.itemId=itemstate.itemId\n' +
            'JOIN itemtype ON item.itemTypeId = itemtype.itemTypeId\n' +
            'WHERE item.itemId = "' + url.itemId + '";\n'

        var sql2 = 'SELECT * FROM item \n' +
            'JOIN itemstate ON item.itemId=itemstate.itemId\n' +
            'JOIN itemtype ON item.itemTypeId = itemtype.itemTypeId\n' +
            'JOIN record ON item.itemId = record.itemId\n' +
            'WHERE item.itemId = "' + url.itemId + '"\n' +
            'ORDER BY date DESC;';

        var sql = sql1 + sql2;

        router.get('/create_qrcode', function (req, res, next) {
            var text = req.query.text;
            try {
                var img = qr.image(text, {size: 10});
                res.writeHead(200, {'Content-Type': 'image/png'});
                img.pipe(res);
            } catch (e) {
                res.writeHead(414, {'Content-Type': 'text/html'});
                res.end('<h1>414 Request-URI Too Large</h1>');
            }
        });

        connection.query(sql, function (err, result) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }

            for (var i = 0; i < result[0].length; i++) {
                states = [];
                statesCounter = -1;
                if (result[0][i].hasOrder === 1) {
                    statesCounter++;
                    states[statesCounter] = '有订单未处理';
                }
                if (result[0][i].lessRest === 1) {
                    statesCounter++;
                    states[statesCounter] = '少剩余';
                }
                if (result[0][i].hasUncheck === 1) {
                    statesCounter++;
                    states[statesCounter] = '存在未检测'
                }
                if (result[0][i].needReturn === 1) {
                    statesCounter++;
                    states[statesCounter] = '需归还物料'
                }
                statesList[i] = states;
            }

            if (states.length === 0) {
                statesCounter++;
                states[statesCounter] = '无'
            }

            var sql3 = 'SELECT * FROM item \n' +
                'JOIN itemstate ON item.itemId=itemstate.itemId\n' +
                'WHERE item.itemId = "' + url.itemId + '";';

            connection.query(sql3, function (err, result) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                ChangeState(result[0].itemNum > result[0].itemAlarmSetting, 'lessRest', 0, url);
                if (result[0].itemNum > result[0].itemAlarmSetting && result[0].lessRest === 1) {
                    addNote('物料事件更新', result[0].itemName, result[0].itemId, '取消少剩余状态');
                }

                ChangeState(result[0].itemNum <= result[0].itemAlarmSetting, 'lessRest', 1, url);
                if (result[0].itemNum <= result[0].itemAlarmSetting && result[0].lessRest === 0) {
                    addNote('物料事件更新', result[0].itemName, result[0].itemId, '少剩余');
                }

                connection.query(itemOrderListSql, function (err, itemOrderList) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                    }

                    let itemTypeSql = 'SELECT * FROM itemtype;';
                    connection.query(itemTypeSql, function (err, itemTypes) {
                        if (err) {
                            console.log('[SELECT ERROR] - ', err.message);
                        }

                        res.render('adItem', {
                            user: req.session.user,
                            item: itemOrderList[0],
                            recordList: itemOrderList[1],

                            itemStateList: statesList,
                            itemTypes: itemTypes,
                        });

                    });


                });


            });

        });


        // res.render('adItem', {
        //     item:result[0],
        //     itemStateList:statesList,
        //     recordList:result[1],
        //     user:req.session.user,
        //     itemTypes : itemTypes
        // });

    }

});






/* GET  itemAddPage. */
router.get('/adItemAdd', function(req, res, next) {
    let itemTypeSql = 'SELECT * FROM itemtype;';
    connection.query(itemTypeSql,function (err, itemTypes) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        res.render('adItemAdd', {user:req.session.user, itemTypes : itemTypes });
    });
});



router.post('/adItemAdd',upload.single('addFileName'), function(req, res, next) {
    var hadId=true;
    var  checkSql = 'SELECT * FROM item';
    var fileName='null';

    connection.query(checkSql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        var pinstrName=req.body.addName;
        var fistzmName=pinyin(pinstrName,{style:pinyin.STYLE_FIRST_LETTER}).toString();
        var itemNameFinal= fistzmName.replace(new RegExp(",",'g'),"").toUpperCase();

        var pinstrSize=req.body.addSize;
        var fistzmSize=pinyin(pinstrSize,{style:pinyin.STYLE_FIRST_LETTER}).toString();
        var fistzmSizeFinal=fistzmSize.replace(new RegExp(",",'g'),"").toUpperCase();

        var itemIdFinal=itemNameFinal+fistzmSizeFinal+'-'+( "00000000" + (parseInt(result.length)+1) ).substr( -5 ) ;
        var addModelFinal =req.body.addModel;
        if(addModelFinal===''){
            addModelFinal = itemIdFinal;
        }

        var checkItemIdSQL='SELECT * FROM item WHERE itemName=\''+req.body.addName+req.body.addSize+'\''+'AND itemSupplier=\''+req.body.addSupplier+'\'';
        var checkItemModelSQL='SELECT * FROM item WHERE itemModel=\''+addModelFinal+'\'';
        connection.query(checkItemIdSQL,function (err, result1) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                return;
            }
            connection.query(checkItemModelSQL,  function (err, result2) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
            if(result1.length!==0){
                hadId=false;
                return  res.send('物料添加失败：您所添加的物料【物料编号】已存在于物料列表中。')
            }else if(result2.length!==0){
                    hadId=false;
                    return  res.send('物料添加失败：您所添加的物料【型号(图号)】已存在于物料列表中。')
            }else{
               // console.log(req.file!==undefined);
                //  console.log(req.file.filename);
                if(req.file!==undefined){
                    fileName=req.file.filename;
                }
                //console.log(fileName);

                if(hadId){

                    var  addSql1 = 'INSERT INTO item(itemId,itemName,itemTypeId,itemNum,itemTemNum,itemUnit,itemArea,itemAlarmSetting,itemNote,itemFileName,itemModel,itemSupplier,itemPrice) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)';
                    var  addSqlParams1 = [itemIdFinal,req.body.addName+req.body.addSize,req.body.addType,0,0,req.body.addUnit,req.body.addArea,req.body.addAlarmSetting,req.body.addNote,fileName,addModelFinal,req.body.addSupplier,(req.body.addPrice === "" ? 0:req.body.addPrice) ];
                    var  addSql2 = 'INSERT INTO itemstate(itemId,hasOrder,lessRest,hasUncheck) VALUES(?,?,?,?)';
                    var  addSqlParams2 = [itemIdFinal,0,1,0 ];
                    connection.query(addSql1,addSqlParams1,   function  (err, result) {
                        if(err){
                            console.log('[INSERT ERROR] - ',err.message);
                            return;
                        }
                        connection.query(addSql2,addSqlParams2,function(err, result) {
                            if(err){
                                console.log('[INSERT ERROR] - ',err.message);
                                return;
                            }
                            // console.log(req.file!==undefined);
                            //  console.log(req.file.filename);
                            if(req.file!==undefined){
                                fileName=req.file.filename;
                            }

                            addNote('物料事件更新',req.body.addName+req.body.addSize,itemIdFinal,'添加新物料');
                            //console.log(fileName)
                        });

                    });
                    var flashUrl='aditem?itemId='+itemIdFinal+'&returnSql=undefined'+'&itemModel='+addModelFinal;
                    return res.redirect('flash?url='+flashUrl)

                    }

                }

            });
        });

    });


});





/* GET QRCodePrint. */
router.get('/qrCodePrint', function(req, res, next) {
    var statesCounter;
    var states=[];
    var statesList=[];

    var url=URL.parse(req.url,true).query;

    var sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId='+'\''+url.itemId+'\'';

    router.get('/create_qrcode', function (req, res, next) {
        var text = req.query.text;
        try {
            var img = qr.image(text, {size: 10});
            res.writeHead(200, {'Content-Type': 'image/png'});
            img.pipe(res);
        } catch (e) {
            res.writeHead(414, {'Content-Type': 'text/html'});
            res.end('<h1>414 Request-URI Too Large</h1>');
        }
    });



    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        console.log(result);

            states=[];
            statesCounter=-1;
            if(result.hasOrder===1){
                statesCounter++;
                states[statesCounter]='有订单未处理';
            }
            if(result.lessRest===1){
                statesCounter++;
                states[statesCounter]='少剩余';
            }
            if(result.hasUncheck===1){
                statesCounter++;
                states[statesCounter]='存在未检测'
            }
            if(result.hasOrder===0&&result.lessRest===0&&result.hasUncheck===0){
                statesCounter++;
                states[statesCounter]='无'
            }
            statesList=states;


        console.log(result)
        res.render('qrCodePrint', {
            itemList:result,
            itemStateList:statesList,
        });

    });

});

/* GET adItemExit */
router.get('/adItemExit', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    getInfo(url,function (err,result) {
        // console.log(result)

        return  res.render('adItemExit', {
            itemList:result.item,
            itemStateList:result.itemStateList,
            user:req.session.user
        });
    })

});


router.post('/adItemExit', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var  addSql = 'INSERT INTO record(itemId,type,date,manager,deliver,note,orderId,state,reason,applicant,returnee,num,exitDate,returnNum) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    var  date= new Date();
    var year= parseInt(date.getFullYear()) ;
    var month=parseInt(date.getMonth()+1);
    var day=parseInt(date.getDate());
    var hour=parseInt(date.getHours());
    var min=parseInt(date.getMinutes());
    var sec=parseInt(date.getSeconds());

    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
    var state='null';
    var returnNum=0;
    if(req.body.reason==='返工（需归还）'||req.body.reason==='借用（需归还）'){
        state='未处理'
        returnNum=req.body.num;
    }


    var  addSqlParams = [url.itemId, '出仓',dateOutput, req.body.manager, 'null',req.body.note,'null',state,req.body.reason,req.body.applicant,'null',req.body.num,'1111-01-01 01:01:01',returnNum];


    //改====
    var  sql = 'SELECT * FROM item WHERE itemId='+'\''+url.itemId+'\''; //select id,name From websites=rowDataPacket{id,name}
    connection.query(sql,function (err, result) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            return;
        }

        //console.log(parseInt(req.body.num));

        if(parseInt(req.body.num)>parseInt(result[0].itemNum)){
            return  res.send('出仓失败：您所申请的出仓物料数量大于库存数量。')
        }else{
            connection.query(addSql,addSqlParams,function (err, result1) {
                if(err){
                    console.log('[INSERT ERROR] - ',err.message);
                    return;
                }

                if(req.body.reason==='返工（需归还）'||req.body.reason==='借用（需归还）'){
                    ChangeState(true,'needReturn',1,url);
                    addNote('物料事件更新',result[0].itemName,result[0].itemId,'需归还物料');
                }

                var modSql = 'UPDATE item SET itemNum = ? WHERE itemId = '+'\''+url.itemId+'\'';
                var updateNum=result[0].itemNum-parseInt(req.body.num) ;

                var modSqlParams = [updateNum];
                connection.query(modSql,modSqlParams,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }

                });

            });
        }

        var flashUrl='adItem?itemId='+url.itemId+'&returnSql='+url.returnSql+'&itemModel='+url.itemModel;
        res.redirect(flashUrl)
    });





//====改
});





/* GET adItemTemEnter */
router.get('/adItemTemEnter', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var orderId=url.orderId;
    var checksql='SELECT * FROM orderlist WHERE orderId='+'\''+url.orderId+'\'';
        connection.query(checksql,function (err, order) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
                return;
            }
            getInfo(url,function (err,item) {
                // console.log(result)
                return  res.render('adItemTemEnter', {
                    itemList:item.item,
                    itemStateList:item.itemStateList,
                    orderId:orderId,
                    totalNum:order[0].totalNum,
                    getNum:order[0].getNum,
                    pendingNum:order[0].pendingNum,
                    returnNum:order[0].returnNum,
                    supplier:url.supplier,
                    user:req.session.user
                });
            })
        });
});
router.post('/adItemTemEnter', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var  addSql = 'INSERT INTO record(itemId,type,date,manager,deliver,note,orderId,state,reason,applicant,returnee,num,exitDate,returnNum) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    var  saveDate= new Date();
    var year= parseInt(saveDate.getFullYear()) ;
    var month=parseInt(saveDate.getMonth()+1);
    var day=parseInt(saveDate.getDate());
    var hour=parseInt(saveDate.getHours());
    var min=parseInt(saveDate.getMinutes());
    var sec=parseInt(saveDate.getSeconds());
    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
    //console.log(dateOutput)

    var orderId, modSql, modSqlParams, checksql, flashUrl;
    orderId=url.orderId;

    if (orderId.toString().substring(0,3) === 'ONE') {
        checksql = 'SELECT * \n' +
            'FROM orderlist\n' +
            'JOIN item_one\n' +
            'ON orderlist.orderId = item_one.orderId\n' +
            'WHERE orderlist.orderId = ' + '"' + orderId + '";';
    } else {
        checksql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+orderId+'\'';
    }
    connection.query(checksql,function (err, orderItem) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            return;
        }
        if(req.body.enterModel==='临时进仓'){
            if(orderItem[0].totalNum<parseInt( orderItem[0].getNum)+parseInt( orderItem[0].pendingNum)+parseInt( orderItem[0].returnNum)+parseInt(req.body.saveNum) ){
                return  res.send('临时进仓失败：进仓数量超过应收数量。');
            }else{
                modSql = 'UPDATE orderlist SET pendingNum = ? WHERE orderId = '+'\''+orderId+'\'';
                modSqlParams = [parseInt( orderItem[0].pendingNum)+parseInt(req.body.saveNum)];
//改
                connection.query(modSql,modSqlParams,function (err) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                    }
                });
            }
        }else if(req.body.enterModel==='退还进仓至临时仓库'){
            if(req.body.saveNum>orderItem[0].returnNum){
                return  res.send('临时进仓失败：临时进仓数量超过退回数量。');
            }else{
                var modSql = 'UPDATE orderlist SET pendingNum = ?, returnNum=? WHERE orderId = '+'\''+orderId+'\'';
                var modSqlParams = [parseInt(orderItem[0].pendingNum)+parseInt(req.body.saveNum) ,parseInt(orderItem[0].returnNum)- parseInt(req.body.saveNum)];
//改
                connection.query(modSql,modSqlParams,function (err) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                    }
                });
            }
        }

        if (orderId.toString().substring(0,3) !== 'ONE') {
            itemEnter();
        }

        OrderState(orderItem[0].itemName);
        addNotification('已临时进仓',req.body.saveNum);


        flashUrl='adOrder?orderId='+orderItem[0].orderId;
        return res.redirect('flash?url='+flashUrl)

    });


    function itemEnter() {
        var  addSqlParams = [url.itemId, '临时进仓',dateOutput, req.body.saveManager,req.body.saveDeliver,req.body.saveNote,url.orderId,'未处理','null','unll','null',req.body.saveNum,'1111-01-01 01:01:01',0];
        connection.query(addSql,addSqlParams,function (err, result) {
            if(err){
                console.log('[INSERT ERROR] - ',err.message);
            }
        });
        //改====
        var  sql = 'SELECT * FROM item WHERE itemId='+'\''+url.itemId+'\''; //select id,name From websites=rowDataPacket{id,name}
        connection.query(sql,function (err, result) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
                return;
            }
            var modSql = 'UPDATE item SET itemTemNum = ? WHERE itemId = '+'\''+url.itemId+'\'';
            var updateNum=result[0].itemTemNum+parseInt(req.body.saveNum) ;
            var modSqlParams = [updateNum];
            connection.query(modSql,modSqlParams,function (err) {
                if(err){
                    console.log('[UPDATE ERROR] - ',err.message);
                }
            });
        });
    }

    function addNotification(enterModel,addSqlInput) {
        var countSql='SELECT * FROM notification';
        var checkSql='SELECT * \n' +
            'FROM orderlist\n' +
            'LEFT JOIN item\n' +
            'ON orderlist.itemId = item.itemId\n' +
            'LEFT JOIN item_one\n' +
            'ON orderlist.orderId = item_one.orderId\n' +
            'WHERE orderlist.orderId='+'\''+url.orderId+'\'';
        var  itemId;
        connection.query( checkSql,function (err, result0) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            connection.query( countSql,function (err, result1) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }
                var  addSql = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                if (result0[0].itemId){
                    itemId = result0[0].itemId;
                } else {
                    itemId = result0[0].itemOneId;
                }
                var  addSqlParams =[dateOutput, '采购事件更新',enterModel,addSqlInput,itemId,url.orderId ];
                connection.query(addSql,addSqlParams,function (err) {
                    if(err){
                        console.log('[INSERT ERROR] - ',err.message);
                    }
                });
            });
        });
    }

    function OrderState(itemName) {
        var checksql='SELECT * FROM orderlist WHERE orderId='+'\''+url.orderId+'\'';
        connection.query( checksql,function (err, result) {
            if(parseInt(result[0].returnNum) ===0){
                var modSql;
                var modSqlParams;
                if(result[0].totalNum===result[0].getNum+result[0].pendingNum&&result[0].arriveDate===null){
                    modSql = 'UPDATE orderlist SET state = ?,arriveDate=? WHERE orderId = '+'\''+url.orderId+'\'';
                    modSqlParams = ['已到货',dateOutput];
                }else{
                   modSql = 'UPDATE orderlist SET state = ? WHERE orderId = '+'\''+url.orderId+'\'';
                   modSqlParams = ['已到货'];
                }
//改
                connection.query(modSql,modSqlParams,function (err) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }
                });
                addNote('采购事件更新',itemName,url.orderId,'已到货');
            }
        });
    }

});

/* GET adItemEnter */
router.get('/adItemEnter', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var orderId='无（直接进仓）';
    var supplier='';

    if(url.orderId!==undefined){
        orderId=url.orderId;
        var checksql='SELECT * FROM orderlist WHERE orderId='+'\''+url.orderId+'\'';
        connection.query(checksql,function (err, result1) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
                return;
            }
            getInfo(url,function (err,result) {
                // console.log(result)
                return  res.render('adItemEnter', {
                    orderPrice:result1[0].price,
                    itemList:result.item,
                    itemStateList:result.itemStateList,
                    orderId:orderId,
                    totalNum:result1[0].totalNum,
                    getNum:result1[0].getNum,
                    pendingNum:result1[0].pendingNum,
                    returnNum:result1[0].returnNum,
                    supplier:url.supplier,
                    user:req.session.user
                });
            })
        });
    }else{
        if(url.supplier!==undefined){
            supplier=url.supplier;
        }
        getInfo(url,function (err,result) {
            // console.log(result)
            return  res.render('adItemEnter', {
                orderPrice:result.item.itemPrice,
                itemList:result.item,
                itemStateList:result.itemStateList,
                orderId:orderId,
                totalNum:0,
                getNum:0,
                pendingNum:0,
                returnNum:0,
                supplier:supplier,
                user:req.session.user
            });
        })
    }





});

router.post('/adItemEnter', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var  addSql = 'INSERT INTO record(itemId,type,date,manager,deliver,note,orderId,state,reason,applicant,returnee,num,exitDate,returnNum,price) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

    //console.log(dateOutput)
    var orderId='无（直接进仓）';
    var checkSql, modSql, modSqlParams, flashUrl;

    if(url.orderId!==undefined){
        orderId=url.orderId;

        if (url.orderId.toString().substring(0,3) === 'ONE') {
            checkSql = 'SELECT * \n' +
                'FROM orderlist\n' +
                'JOIN item_one\n' +
                'ON orderlist.orderId = item_one.orderId\n' +
                'WHERE orderlist.orderId = ' + '"' + url.orderId + '";';
        } else {
            checkSql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+url.orderId+'\'';
        }

        connection.query(checkSql,function (err, result1) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
                return;
            }
            if(req.body.enterModel==='直接进仓'){

                if(result1[0].totalNum<parseInt( result1[0].getNum)+parseInt( result1[0].pendingNum)+parseInt( result1[0].returnNum)+parseInt(req.body.saveNum) ){
                    return  res.send('进仓失败：进仓数量超过应收数量。');
                }else{
                    modSql = 'UPDATE orderlist SET getNum = ? WHERE orderId = '+'\''+url.orderId+'\'';
                    modSqlParams = [parseInt( result1[0].getNum)+parseInt(req.body.saveNum) ];

//改
                    connection.query(modSql,modSqlParams,function (err, ) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                        }
                    });

                    if (url.orderId.toString().substring(0,3) !== 'ONE') {
                        itemEnter();
                    }

                    OrderCompeleted(result1[0].itemName);
                    addNotification('已进仓',req.body.saveNum);

                    flashUrl='adOrder?orderId='+url.orderId;
                    return res.redirect('flash?url='+flashUrl)
                }
            }else if(req.body.enterModel==='验收进仓'){
                if(req.body.saveNum>result1[0].pendingNum){
                    return  res.send('进仓失败：验收数量超过待检数量。');
                }else{
                    modSql = 'UPDATE orderlist SET getNum = ?, pendingNum=? WHERE orderId = '+'\''+url.orderId+'\'';
                    modSqlParams = [parseInt(result1[0].getNum)+parseInt(req.body.saveNum) ,parseInt(result1[0].pendingNum)- parseInt(req.body.saveNum)];
//改
                    if(parseInt(req.body.saveNum)===result1[0].pendingNum){
                        var modSql2='UPDATE record SET state = ? WHERE orderId ='+'\''+url.orderId+'\'' ;
                        var modSqlParams2 = ['已处理'];

                        connection.query(modSql2,modSqlParams2,function (err, result) {
                            if(err){
                                console.log('[UPDATE ERROR] - ',err.message);
                                return;
                            }

                        });
                    }
                    connection.query(modSql,modSqlParams,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }

                    });

                    if (url.orderId.toString().substring(0,3) !== 'ONE') {

                        var modSql3='UPDATE item SET itemTemNum=? WHERE itemId='+'\''+result1[0].itemId+'\''
                        var modSqlParams3 = [parseInt(result1[0].itemTemNum)-req.body.saveNum];
                        connection.query(modSql3,modSqlParams3,function (err, result) {
                            if(err){
                                console.log('[UPDATE ERROR] - ',err.message);
                            }
                        });

                        itemEnter();
                    }

                    OrderCompeleted(result1[0].itemName);
                    addNotification('已验收进仓',req.body.saveNum);

                    flashUrl='adOrder?orderId='+url.orderId;
                    return res.redirect('flash?url='+flashUrl)
                }
            }else if(req.body.enterModel==='退还进仓'){
                if(req.body.saveNum>result1[0].returnNum){
                    return  res.send('进仓失败：退还数量超过退回数量。');
                }
                else {
                    modSql = 'UPDATE orderlist SET getNum = ?, returnNum=? WHERE orderId = '+'\''+url.orderId+'\'';
                    modSqlParams = [parseInt(result1[0].getNum)+parseInt(req.body.saveNum) ,parseInt(result1[0].returnNum)- parseInt(req.body.saveNum)];

//改
                    connection.query(modSql,modSqlParams,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }

                    });

                    if (url.orderId.toString().substring(0,3) !== 'ONE') {
                        itemEnter();
                    }

                    OrderCompeleted(result1[0].itemName);
                    addNotification('已退还进仓',req.body.saveNum);

                    flashUrl='adOrder?orderId='+url.orderId;
                    return res.redirect('flash?url='+flashUrl)
                }
            }
        });
    } else{
       itemEnter()

        flashUrl='adItem?itemId='+url.itemId+'&returnSql='+url.returnSql+'&itemModel='+url.itemModel;
        return res.redirect(flashUrl)
    }


    function itemEnter() {
        var supplier=url.supplier;
        if(supplier===''){
            supplier=req.body.saveSupplier;
        }
        var  saveDate= new Date();
        var year= parseInt(saveDate.getFullYear()) ;
        var month=parseInt(saveDate.getMonth()+1);
        var day=parseInt(saveDate.getDate());
        var hour=parseInt(saveDate.getHours());
        var min=parseInt(saveDate.getMinutes());
        var sec=parseInt(saveDate.getSeconds());
        var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
        var  addSqlParams = [url.itemId, '进仓',dateOutput, req.body.saveManager,req.body.saveDeliver,req.body.saveNote,orderId,'null','null','unll','null',req.body.saveNum,'1111-01-01 01:01:01',0, req.body.savePrice];
        connection.query(addSql,addSqlParams,function (err, result) {
            if(err){
                console.log('[INSERT ERROR] - ',err.message);
                return;
            }

        });


        //改====
        var  sql = 'SELECT * FROM item WHERE itemId='+'\''+url.itemId+'\''; //select id,name From websites=rowDataPacket{id,name}
        connection.query(sql,function (err, result) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
                return;
            }

            var modSql = 'UPDATE item SET itemNum = ? WHERE itemId = '+'\''+url.itemId+'\'';
            var updateNum=result[0].itemNum+parseInt(req.body.saveNum) ;

            var modSqlParams = [updateNum];
            connection.query(modSql,modSqlParams,function (err, result) {
                if(err){
                    console.log('[UPDATE ERROR] - ',err.message);
                    return;
                }


            });

        });



    }

    function addNotification(enterModel,addSqlInput) {
        var  saveDate= new Date();
        var year= parseInt(saveDate.getFullYear()) ;
        var month=parseInt(saveDate.getMonth()+1);
        var day=parseInt(saveDate.getDate());
        var hour=parseInt(saveDate.getHours());
        var min=parseInt(saveDate.getMinutes());
        var sec=parseInt(saveDate.getSeconds());
        if(enterModel==='已完成'){
            sec=parseInt(sec)+1;
        }

        var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
        console.log(dateOutput);
        var countSql='SELECT * FROM notification';
        var checkSql='SELECT * \n' +
            'FROM orderlist\n' +
            'LEFT JOIN item\n' +
            'ON orderlist.itemId = item.itemId\n' +
            'LEFT JOIN item_one\n' +
            'ON orderlist.orderId = item_one.orderId\n' +
            'WHERE orderlist.orderId='+'\''+url.orderId+'\'';
        var  itemId;
        connection.query( checkSql,function (err, result0) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            connection.query( countSql,function (err, result1) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }
                var  addSql = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                if (result0[0].itemId){
                    itemId = result0[0].itemId;
                } else {
                    itemId = result0[0].itemOneId;
                }
                var  addSqlParams =[dateOutput, '采购事件更新',enterModel,addSqlInput,itemId,url.orderId ];
               // console.log(addSqlParams)
                connection.query(addSql,addSqlParams,function (err, result) {
                    if(err){
                        console.log('[INSERT ERROR] - ',err.message);
                        return;
                    }

                });


            });
        });
    }

    function OrderCompeleted(itemName) {
        var  saveDate= new Date();
        var year= parseInt(saveDate.getFullYear()) ;
        var month=parseInt(saveDate.getMonth()+1);
        var day=parseInt(saveDate.getDate());
        var hour=parseInt(saveDate.getHours());
        var min=parseInt(saveDate.getMinutes());
        var sec=parseInt(saveDate.getSeconds());
        var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
        var checksql='SELECT * FROM orderlist WHERE orderId='+'\''+url.orderId+'\'';
        var modSql, modSqlParams;
        connection.query( checksql,function (err, result) {
            if(result[0].totalNum===result[0].getNum){

                if(result[0].totalNum===result[0].getNum+result[0].pendingNum&&result[0].arriveDate===null){
                    modSql = 'UPDATE orderlist SET state = ?,arriveDate=? WHERE orderId = '+'\''+url.orderId+'\'';
                    modSqlParams = ['已完成',dateOutput];
                }else{
                    modSql = 'UPDATE orderlist SET state = ? WHERE orderId = '+'\''+url.orderId+'\'';
                    modSqlParams = ['已完成'];
                }

//改
                connection.query(modSql,modSqlParams,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }

                });

                if (orderId.toString().substring(0,3) !== 'ONE') {
                    var checksql = 'SELECT * FROM orderlist WHERE (state=\'已下单\'OR state=\'申请中\' OR state=\'已到货\' OR state=\'有退回\') AND itemId=' + '\'' + result[0].itemId + '\'';
                    connection.query(checksql, function (err, result2) {
                        if (parseInt(result2.length) === 0) {
                            ChangeState(true, 'hasOrder', 0, url);
                            addNote('物料事件更新', itemName, result[0].itemId, '取消有订单未处理状态')
                        } else {
                        }
                    })
                }

                addNotification('已完成', ' ')
                addNote('采购事件更新',itemName,url.orderId,'已完成')

            }else{
                if(parseInt(result[0].returnNum) ===0){
                        modSql = 'UPDATE orderlist SET state = ? WHERE orderId = '+'\''+url.orderId+'\'';
                        modSqlParams = ['已到货'];
                        if(result[0].totalNum===result[0].getNum+result[0].pendingNum&&result[0].arriveDate===null){
                            modSql = 'UPDATE orderlist SET state = ?,arriveDate=? WHERE orderId = '+'\''+url.orderId+'\'';
                            modSqlParams = ['已到货',dateOutput];
                        }else{
                            modSql = 'UPDATE orderlist SET state = ? WHERE orderId = '+'\''+url.orderId+'\'';
                            modSqlParams = ['已到货'];
                        }

//改
                    connection.query(modSql,modSqlParams,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }

                    });
                    addNote('采购事件更新',itemName,url.orderId,'已到货')
                }
            }

        });
    }
//====改
});








/* GET adItemReturn */
router.get('/adItemReturn', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var date=new Date(url.exitDate)

    var y=date.getFullYear();
    var mon=date.getMonth()+1;
    var day=date.getDate();
    var h=date.getHours()-8;
    if(parseInt(h)<0){
        day=day-1;
        h=24+h;
    }
    var min=date.getMinutes();
    var sec=date.getSeconds();


    var getDate=y+"-"+mon+"-"+day+" "+h+':'+min+':'+sec;
    //console.log(getDate)
    getInfo(url,function (err,result) {
        console.log(result)
        return  res.render('adItemReturn', {
            itemList:result.item,
            itemStateList:result.itemStateList,
            getDate: getDate,
            getNum:url.exitNum,
            supplier:url.supplier,
            user:req.session.user
        });
    })
});


router.post('/adItemReturn', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var  addSql = 'INSERT INTO record(itemId,type,date,manager,deliver,note,orderId,state,reason,applicant,returnee,num,exitDate,returnNum) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    var  saveDate= new Date();
    var year= parseInt(saveDate.getFullYear()) ;
    var month=parseInt(saveDate.getMonth()+1);
    var day=parseInt(saveDate.getDate());
    var hour=parseInt(saveDate.getHours());
    var min=parseInt(saveDate.getMinutes());
    var sec=parseInt(saveDate.getSeconds());
    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
   // console.log(dateOutput)

    var  urlDate= new Date(url.exitDate);
    var urlyear= parseInt(urlDate.getFullYear()) ;
    var urlmonth=parseInt(urlDate.getMonth()+1);
    var urlday=parseInt(urlDate.getDate());
    var urlhour=parseInt(urlDate.getHours())-8;
    if(parseInt(urlhour)<0){
        urlday=urlday-1;
        urlhour=24+urlhour;
    }
    var urlmin=parseInt(urlDate.getMinutes());
    var urlsec=parseInt(urlDate.getSeconds());
    var urldateOutput= urlyear+'-'+urlmonth+'-'+urlday+' '+urlhour+':'+urlmin+':'+urlsec;

    //console.log("asda"+urldateOutput)






    var  sql2 = 'SELECT * FROM record,item WHERE record.itemId=item.itemId AND record.date='+'\''+urldateOutput+'\''; //select id,name From websites=rowDataPacket{id,name}
    connection.query(sql2,function (err, result) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            return;
        }
        //console.log("lalalal"+result[0].num)
        if(parseInt( result[0].returnNum)<parseInt( req.body.num)){
            return  res.send('归还进仓失败：您所申请的归还物料数量大于需归还数量。')
        }else{

            var  addSqlParams = [url.itemId, '归还进仓',dateOutput, req.body.manager,'null',req.body.note,'null','null','null','unll',req.body.returnee,req.body.num,new Date(urldateOutput),0];
            connection.query(addSql,addSqlParams,function (err, result) {
                if(err){
                    console.log('[INSERT ERROR] - ',err.message);
                    return;
                }

            });


            //改====
            var  sql = 'SELECT * FROM item WHERE itemId='+'\''+url.itemId+'\''; //select id,name From websites=rowDataPacket{id,name}
            connection.query(sql,function (err, result) {
                if(err){
                    console.log('[SELECT ERROR] - ',err.message);
                    return;
                }

                var modSql = 'UPDATE item SET itemNum = ? WHERE itemId = '+'\''+url.itemId+'\'';
                var updateNum=result[0].itemNum+parseInt(req.body.num) ;

                var modSqlParams = [updateNum];
                connection.query(modSql,modSqlParams,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }

                });
            });

            modSql = 'UPDATE record SET returnNum = ? WHERE date = '+'\''+urldateOutput+'\'';
            modSqlParams = [parseInt(result[0].returnNum) -parseInt(req.body.num)];
            if(parseInt( result[0].returnNum)===parseInt( req.body.num)){
                var modSql = 'UPDATE record SET state = ?, returnNum = ? WHERE date = '+'\''+urldateOutput+'\'';
                var updateState='已处理';
                var modSqlParams = [updateState,parseInt(result[0].returnNum) -parseInt(req.body.num)];


            }
            connection.query(modSql,modSqlParams,function (err, result) {
                if(err){
                    console.log('[UPDATE ERROR] - ',err.message);
                    return;
                }


            });

            var checksql='SELECT * FROM record WHERE (reason=\'借用（需归还）\' OR reason=\'返工（需归还）\') AND state=\'未处理\' AND itemId='+'\''+url.itemId+'\'';
            connection.query( checksql,function (err, result2) {
                //console.log("@@@"+result2.length)
                if(result2.length===0){
                    ChangeState(true,'needReturn',0,url);
                    addNote('物料事件更新',result[0].itemName,result[0].itemId,'取消需归还物料状态');
                }
            })




            var flashUrl='adItem?itemId='+url.itemId+'&returnSql='+url.returnSql+'&itemModel='+url.itemModel;
            res.redirect(flashUrl)
        }




    });





//====改
});

/* GET adItemReturnSelect */
router.get('/adItemReturnSelect', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var  sql = 'SELECT * FROM record WHERE itemId='+'\''+url.itemId+'\''+'AND state=\'未处理\''+'AND (reason=\'借用（需归还）\''+'OR reason=\'返工（需归还）\')'; //select id,name From websites=rowDataPacket{id,name}
//console.log(sql)
    connection.query(sql,function (err, result1) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }

       getInfo(url,function (err,result2) {
            // console.log(result)
           // console.log(result1)
            return  res.render('adItemReturnSelect', {
                itemList:result2.item,
                itemStateList:result2.itemStateList,
                recordList:result1,
                user:req.session.user
            });
        });

    });

});

/* GET adOrderMan*/
router.get('/adOrderMan', function(req, res, next) {
    var sql='SELECT COUNT(orderId) AS orderCount FROM orderlist;'

    connection.query( sql,function (err, orderCount) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }
        res.render('adOrderMan', {
            orderCount: orderCount[0].orderCount,
            user:req.session.user,
            isFetch: true
        });
    });
});


router.get('/AjaxFetchOrder', function(req, res) {
    const limit = req.query.limit;
    const start = req.query.start;

    let sql='SELECT orderlist.orderId, state, applyDate, commingDate, orderDate, item.itemId, applyNote, replyNote, orderlist.totalNum, getNum, pendingNum,' +
        'IFNULL(item.itemModel,"") AS itemModel, IFNULL(item.itemName,"") AS itemName, IFNULL(item.itemSupplier,"") AS itemSupplier,' +
        'IFNULL(item_one.itemSupplier,"") AS oneItemSupplier, IFNULL(item_one.itemName,"") AS oneItemName, IFNULL(item_one.itemModel,"") AS oneItemModel,\n' +
        'CASE  \n' +
        'WHEN state = \'申请中\' OR state = \'已下单\' OR state = \'有退回\' OR (state = \'已到货\' AND getNum+pendingNum != totalNum) THEN 1\n' +
        'WHEN (state = \'已到货\' AND getNum+pendingNum = totalNum)\n' +
        ' THEN 2\n' +
        'WHEN state = \'已取消\'  THEN 3\n' +
        'WHEN state = \'已拒绝\'  THEN 4\n' +
        'WHEN state = \'已完成\' THEN 5\n' +
        'END AS order_param\n' +
        'FROM orderlist\n' +
        'LEFT JOIN item\n' +
        'ON orderlist.itemId = item.itemId\n' +
        'LEFT JOIN item_one\n' +
        'ON orderlist.orderId = item_one.orderId\n' +
        'ORDER BY  order_param,commingDate DESC,orderDate ASC\n' +
        'LIMIT ' + start + ',' + limit;

    function getOrderURL(orderId){return "location.href='/adOrder?orderId=" + orderId + "'";}


    function orderStateColor (state){
        switch (state){
            case '已下单': return 'green'; break;
            case '申请中': return 'orange'; break;
            case '已到货': return 'green'; break;
            case '已取消': return 'red'; break;
            case '已拒绝': return 'red'; break;
            case '已完成': return 'grey'; break;
            case '有退回': return '#fe007b'; break;
        }
    }

    function comingDateColor (getNum,totalNum, state){if (getNum === totalNum && state === '已到货') {return 'green';} return '#0050fa'}
    function comingDateText (getNum,totalNum, comingDate, state){if (getNum === totalNum && state === '已到货') {return '订单货物已全部到达';}return comingDate.getFullYear()+"-"+(comingDate.getMonth()+1)+"-"+comingDate.getDate()}
    function comingDateDisplay(state){if (state === '已完成' || state === '已拒绝' || state === '已取消'){return 'none'}return ''}

    function isDisplay(state, judge){
        if (state === '申请中'){
            if (judge === 'applyDate'){
                return ''
            } else if (judge === 'orderDate'){
                return 'none'
            }
        } else {
            if (judge === 'applyDate'){
                return 'none'
            } else if (judge === 'orderDate'){
                return ''
            }
        }
    }

    function overDateDisplay(overDays, state){if (overDays>=0 && (state === '申请中' || state === '已下单')){return ''}return 'none'}
    function overDaysColor(overDays){if (overDays===0){return 'orange'} return 'red'}
    function overDaysText(overDays){if (overDays===0){return '(今天应到货)'}return '（已逾期' + overDays +'天）'}

    connection.query( sql,function (err, orderList) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        var HTMLText='';

        for(let i = 0; i < orderList.length ;i++){
            let startInt = parseInt(start);
            let overDays = parseInt((new Date()-orderList[i].commingDate)/ (1000 * 60 * 60 * 24));
            let state = orderList[i].state;

            HTMLText += 
                '                    <table class="noteButton" style=";width: 100%;font-size: 1rem;height: 100%" cellpadding="0" cellspacing="0">\n' +
                '                        <tr >\n' +
                '                            <td style="width: 87%;">\n' +
                '                                <button class="noteButton" style="padding-left: 80px;" type="button" onclick="' + getOrderURL(orderList[i].orderId) + '">\n' +
                '                                    <div  style= "font-size: 0.7rem; height: 30px; ">\n' +
                '                                        <span class="itemInfo" style="margin-left: -50px;color: #0050fa;">#' + (startInt+i+1) + '</span>\n' +
                '                                        <span class="itemInfo" >采购单号：<a style="font-weight: normal;color: #0050fa;">' + orderList[i].orderId + '</a></span>\n' +
                '                                        <span class="itemInfo" style="margin-left: 170px">状态：<a id=orderState' + i + ' style="color:'+orderStateColor(state)+'; ">' + state + '</a></span>\n' +
                // '                                        <style onload="OrderState('+"orderState"+i+','+"comingDate"+i+','+"applyDate"+i+','+"orderDate"+i+','+(parseInt(orderList[i].getNum)+parseInt(orderList[i].pendingNum))+','+orderList[i].totalNum+')"></style>\n' +
                '                                        <span class="itemInfo" id="applyDate'+i+'" style="margin-left: 280px;display: '+isDisplay(state, "applyDate")+'">申请日期：<a style="font-weight:normal;color: #0050fa; ">'+orderList[i].orderDate.getFullYear()+'-'+(orderList[i].orderDate.getMonth()+1)+'-'+orderList[i].orderDate.getDate()+' &emsp;'+orderList[i].orderDate.getHours()+':'+orderList[i].orderDate.getMinutes()+':'+orderList[i].orderDate.getSeconds()+' </a></span>\n' +
                '                                        <span class="itemInfo" id="orderDate'+i+'" style="margin-left: 280px;display: '+isDisplay(state, "orderDate")+'">下单日期：<a style="font-weight:normal;color: #0050fa; ">'+orderList[i].orderDate.getFullYear()+'-'+(orderList[i].orderDate.getMonth()+1)+'-'+orderList[i].orderDate.getDate()+' &emsp;'+orderList[i].orderDate.getHours()+':'+orderList[i].orderDate.getMinutes()+':'+orderList[i].orderDate.getSeconds()+' </a></span>\n' +
                '                                        <span class="itemInfo" id="comingDate'+i+'" style="margin-left: 480px; display: '+comingDateDisplay(state)+'">到货预期：<span  style="font-weight:normal;color:'+comingDateColor(orderList[i].getNum, orderList[i].totalNum, state)+'; ">'+comingDateText(orderList[i].getNum, orderList[i].totalNum, orderList[i].commingDate, state)+'<span style="color:'+overDaysColor(overDays)+';display: '+ overDateDisplay(overDays, state) +'" id="overDate'+i+'">'+overDaysText(overDays)+'</span></span></span>\n' +
                // '                                        <style onload="overDate(\'overDate'+i+'\',\'overDays'+i+'\')"></style>\n' +
                '                                    </div>\n' +
                '                                    <div  style= "font-size: 0.7rem; height: 30px; ">\n' +
                '                                        <span class="itemInfo" >名称：<a style="font-weight: normal;color: #0050fa;">'+orderList[i].itemName + orderList[i].oneItemName+'</a></span>\n' +
                '                                        <span class="itemInfo" style="margin-left: 170px">型号（图号）：<a style="font-weight:normal;color: #0050fa; ">'+orderList[i].itemModel + orderList[i].oneItemModel+'</a></span>\n' +
                '                                        <span class="itemInfo" style="margin-left: 480px">订单数量：<a style="font-weight:normal;color: #0050fa; ">'+orderList[i].totalNum+'</a></span>\n' +
                '                                    </div>\n' +
                '                                    <div  style= "font-size: 0.7rem; height: 30px; ">\n' +
                '                                        <span class="itemInfo"  >供货商：<a style="font-weight: normal;color: #0050fa;">'+orderList[i].itemSupplier + orderList[i].oneItemSupplier+'</a></span>\n' +
                '                                        <span class="itemInfo" style="margin-left: 170px">申请备注：<a style="font-weight: normal;color: #0050fa;">'+orderList[i].applyNote+'</a></span>\n' +
                '                                        <span class="itemInfo" style="margin-left: 480px" >审批备注：<a style="font-weight: normal;color: #0050fa;">'+orderList[i].replyNote+'</a></span>\n' +
                '                                    </div>\n' +
                '                                </button>\n' +
                '                            </td>\n' +
                '                        </tr>\n' +
                '                    </table>\n' +
                '                </div>'
        }
        res.send(HTMLText);
    })
});

router.post('/adOrderMan', function(req, res, next) {
    var sql;
    var stateJudge=req.body.state;
    let indexOf =  '%' + req.body.indexOf + '%';

    switch (stateJudge) {
        case '0':  sql=undefined; break;
        case '1':  sql='SELECT orderlist.orderId, state, applyDate, commingDate, orderDate, item.itemId, applyNote, replyNote, orderlist.totalNum, getNum, pendingNum,\n' +
            'IFNULL(item.itemModel,"") AS itemModel, IFNULL(item.itemName,"") AS itemName, IFNULL(item.itemSupplier,"") AS itemSupplier,\n' +
            'IFNULL(item_one.itemSupplier,"") AS oneItemSupplier, IFNULL(item_one.itemName,"") AS oneItemName, IFNULL(item_one.itemModel,"") AS oneItemModel\n' +
            'FROM orderlist LEFT JOIN item ON orderlist.itemId = item.itemId LEFT JOIN item_one ON orderlist.orderId = item_one.orderId \n' +
            'WHERE orderlist.state=\'已下单\' ORDER BY orderlist.orderDate DESC'; break;

        case '2':  sql='SELECT orderlist.orderId, state, applyDate, commingDate, orderDate, item.itemId, applyNote, replyNote, orderlist.totalNum, getNum, pendingNum,\n' +
            'IFNULL(item.itemModel,"") AS itemModel, IFNULL(item.itemName,"") AS itemName, IFNULL(item.itemSupplier,"") AS itemSupplier,\n' +
            'IFNULL(item_one.itemSupplier,"") AS oneItemSupplier, IFNULL(item_one.itemName,"") AS oneItemName, IFNULL(item_one.itemModel,"") AS oneItemModel\n' +
            'FROM orderlist LEFT JOIN item ON orderlist.itemId = item.itemId LEFT JOIN item_one ON orderlist.orderId = item_one.orderId \n' +
            'WHERE orderlist.state=\'申请中\' ORDER BY orderlist.orderDate DESC'; break;

        case '3':  sql='SELECT orderlist.orderId, state, applyDate, commingDate, orderDate, item.itemId, applyNote, replyNote, orderlist.totalNum, getNum, pendingNum,\n' +
            'IFNULL(item.itemModel,"") AS itemModel, IFNULL(item.itemName,"") AS itemName, IFNULL(item.itemSupplier,"") AS itemSupplier,\n' +
            'IFNULL(item_one.itemSupplier,"") AS oneItemSupplier, IFNULL(item_one.itemName,"") AS oneItemName, IFNULL(item_one.itemModel,"") AS oneItemModel\n' +
            'FROM orderlist LEFT JOIN item ON orderlist.itemId = item.itemId LEFT JOIN item_one ON orderlist.orderId = item_one.orderId \n' +
            'WHERE orderlist.state=\'已拒绝\' ORDER BY orderlist.orderDate DESC'; break;

        case '4':  sql='SELECT orderlist.orderId, state, applyDate, commingDate, orderDate, item.itemId, applyNote, replyNote, orderlist.totalNum, getNum, pendingNum,\n' +
            'IFNULL(item.itemModel,"") AS itemModel, IFNULL(item.itemName,"") AS itemName, IFNULL(item.itemSupplier,"") AS itemSupplier,\n' +
            'IFNULL(item_one.itemSupplier,"") AS oneItemSupplier, IFNULL(item_one.itemName,"") AS oneItemName, IFNULL(item_one.itemModel,"") AS oneItemModel\n' +
            'FROM orderlist LEFT JOIN item ON orderlist.itemId = item.itemId LEFT JOIN item_one ON orderlist.orderId = item_one.orderId \n' +
            'WHERE orderlist.state=\'已到货\' ORDER BY orderlist.orderDate DESC'; break;

        case '5':  sql='SELECT orderlist.orderId, state, applyDate, commingDate, orderDate, item.itemId, applyNote, replyNote, orderlist.totalNum, getNum, pendingNum,\n' +
            'IFNULL(item.itemModel,"") AS itemModel, IFNULL(item.itemName,"") AS itemName, IFNULL(item.itemSupplier,"") AS itemSupplier,\n' +
            'IFNULL(item_one.itemSupplier,"") AS oneItemSupplier, IFNULL(item_one.itemName,"") AS oneItemName, IFNULL(item_one.itemModel,"") AS oneItemModel\n' +
            'FROM orderlist LEFT JOIN item ON orderlist.itemId = item.itemId LEFT JOIN item_one ON orderlist.orderId = item_one.orderId \n' +
            'WHERE orderlist.state=\'有退回\' ORDER BY orderlist.orderDate DESC'; break;

        case '6':  sql='SELECT orderlist.orderId, state, applyDate, commingDate, orderDate, item.itemId, applyNote, replyNote, orderlist.totalNum, getNum, pendingNum,\n' +
            'IFNULL(item.itemModel,"") AS itemModel, IFNULL(item.itemName,"") AS itemName, IFNULL(item.itemSupplier,"") AS itemSupplier,\n' +
            'IFNULL(item_one.itemSupplier,"") AS oneItemSupplier, IFNULL(item_one.itemName,"") AS oneItemName, IFNULL(item_one.itemModel,"") AS oneItemModel\n' +
            'FROM orderlist LEFT JOIN item ON orderlist.itemId = item.itemId LEFT JOIN item_one ON orderlist.orderId = item_one.orderId \n' +
            'WHERE orderlist.state=\'已完成\' ORDER BY orderlist.orderDate DESC'; break;

        case '7':  sql='SELECT orderlist.orderId, state, applyDate, commingDate, orderDate, item.itemId, applyNote, replyNote, orderlist.totalNum, getNum, pendingNum,\n' +
            'IFNULL(item.itemModel,"") AS itemModel, IFNULL(item.itemName,"") AS itemName, IFNULL(item.itemSupplier,"") AS itemSupplier,\n' +
            'IFNULL(item_one.itemSupplier,"") AS oneItemSupplier, IFNULL(item_one.itemName,"") AS oneItemName, IFNULL(item_one.itemModel,"") AS oneItemModel\n' +
            'FROM orderlist LEFT JOIN item ON orderlist.itemId = item.itemId LEFT JOIN item_one ON orderlist.orderId = item_one.orderId \n' +
            'WHERE orderlist.state=\'已取消\' ORDER BY orderlist.orderDate DESC'; break;
    }

    if(req.body.indexOfButton){
        sql='SELECT orderlist.orderId, state, applyDate, commingDate, orderDate, item.itemId, applyNote, replyNote, orderlist.totalNum, getNum, pendingNum,\n' +
            'IFNULL(item.itemModel,"") AS itemModel, IFNULL(item.itemName,"") AS itemName, IFNULL(item.itemSupplier,"") AS itemSupplier,\n' +
            'IFNULL(item_one.itemSupplier,"") AS oneItemSupplier, IFNULL(item_one.itemName,"") AS oneItemName, IFNULL(item_one.itemModel,"") AS oneItemModel\n' +
            'FROM orderlist LEFT JOIN item ON orderlist.itemId = item.itemId LEFT JOIN item_one ON orderlist.orderId = item_one.orderId \n' +
            'WHERE orderlist.orderId Like "' +indexOf+'" OR item.itemName Like "'+indexOf+'" OR item.itemId Like "'+indexOf+'"OR item.itemSupplier Like "'+indexOf+'"' +
            'OR item_one.itemName Like "'+indexOf+'" OR item_one.itemModel Like "'+indexOf+'" OR item_one.itemSupplier Like "'+indexOf+'" OR item_one.itemId Like "'+indexOf+'"' +
            'OR orderlist.applyNote Like "'+indexOf+'" OR orderlist.replyNote Like "'+indexOf +'";';
    }

    switch (req.body.order) {
        case '0':sql=undefined;break
        case '1':sql='SELECT orderlist.orderId, state, applyDate, commingDate, orderDate, item.itemId, applyNote, replyNote, orderlist.totalNum, getNum, pendingNum,\n' +
            'IFNULL(item.itemModel,"") AS itemModel, IFNULL(item.itemName,"") AS itemName, IFNULL(item.itemSupplier,"") AS itemSupplier,\n' +
            'IFNULL(item_one.itemSupplier,"") AS oneItemSupplier, IFNULL(item_one.itemName,"") AS oneItemName, IFNULL(item_one.itemModel,"") AS oneItemModel\n' +
            'FROM orderlist LEFT JOIN item ON orderlist.itemId = item.itemId LEFT JOIN item_one ON orderlist.orderId = item_one.orderId \n' +
            'ORDER BY orderlist.orderDate DESC;';break
    }

    if (sql === undefined){
        sql='SELECT orderlist.orderId, state, applyDate, commingDate, orderDate, item.itemId, applyNote, replyNote, orderlist.totalNum, getNum, pendingNum,' +
            'IFNULL(item.itemModel,"") AS itemModel, IFNULL(item.itemName,"") AS itemName, IFNULL(item.itemSupplier,"") AS itemSupplier,' +
            'IFNULL(item_one.itemSupplier,"") AS oneItemSupplier, IFNULL(item_one.itemName,"") AS oneItemName, IFNULL(item_one.itemModel,"") AS oneItemModel,\n' +
            'CASE  \n' +
            'WHEN state = \'申请中\' OR state = \'已下单\' OR state = \'有退回\' OR (state = \'已到货\' AND getNum+pendingNum != totalNum) THEN 1\n' +
            'WHEN (state = \'已到货\' AND getNum+pendingNum = totalNum)\n' +
            ' THEN 2\n' +
            'WHEN state = \'已取消\'  THEN 3\n' +
            'WHEN state = \'已拒绝\'  THEN 4\n' +
            'WHEN state = \'已完成\' THEN 5\n' +
            'END AS order_param\n' +
            'FROM orderlist\n' +
            'LEFT JOIN item\n' +
            'ON orderlist.itemId = item.itemId\n' +
            'LEFT JOIN item_one\n' +
            'ON orderlist.orderId = item_one.orderId\n' +
            'ORDER BY  order_param,commingDate DESC,orderDate ASC'
    }

    // console.log(sql);
    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        res.render('adOrderManFilter', {
            orderList:result,
            user:req.session.user,
            orderCount: result.length,
        });
    });

});


/* GET adOrder*/
router.get('/adOrder', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var notificationSql, orderId, orderSql;
    orderId = url.orderId;

    if (orderId.toString().substring(0,3) === 'ONE') {
        orderSql = 'SELECT * \n' +
            'FROM orderlist\n' +
            'JOIN item_one\n' +
            'ON orderlist.orderId = item_one.orderId\n' +
            'WHERE orderlist.orderId = ' + '"' + orderId + '";';

        notificationSql = 'SELECT * FROM notification WHERE notification.orderId=' + '\'' + orderId + '\'' + 'ORDER BY noteDate DESC';

        connection.query(orderSql, function (err, order) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            connection.query(notificationSql, function (err, notification) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }
                res.render('adOrder', {
                    orderList: order,
                    notificationList : notification,
                    user: req.session.user,
                    isDBItem: false
                });
            });
        });
    } else {
        sql = 'SELECT * FROM orderlist,item,itemstate WHERE item.itemId=itemstate.itemId AND orderlist.itemId=item.itemId AND orderlist.orderId=' + '\'' + url.orderId + '\'';
        connection.query(sql, function (err, result1) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            var sql1 = 'SELECT * FROM notification WHERE notification.orderId=' + '\'' + url.orderId + '\'' + 'ORDER BY noteDate DESC';

            connection.query(sql1, function (err, result2) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }

                ChangeState(result1[0].itemTemNum > 0, 'hasUncheck', 1, result1[0]);
                if (result1[0].itemTemNum > 0 && result1[0].hasUncheck === 0) {
                    addNote('物料事件更新', result1[0].itemName, result1[0].itemId, '存在未检测');
                }
                ChangeState(result1[0].itemTemNum <= 0, 'hasUncheck', 0, result1[0]);
                if (result1[0].itemTemNum <= 0 && result1[0].hasUncheck === 1) {
                    addNote('物料事件更新', result1[0].itemName, result1[0].itemId, '取消存在未检测状态');
                }

                // console.log(result2);
                res.render('adOrder', {
                    orderList: result1,
                    notificationList: result2,
                    user: req.session.user,
                    isDBItem: true
                });

            });
        });
    }
});

/* POST adOrder*/
router.post('/adOrder', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var  saveDate= new Date();
    var year= parseInt(saveDate.getFullYear()) ;
    var month=parseInt(saveDate.getMonth()+1);
    var day=parseInt(saveDate.getDate());
    var hour=parseInt(saveDate.getHours());
    var min=parseInt(saveDate.getMinutes());
    var sec=parseInt(saveDate.getSeconds());
    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
    var orderSql, orderId, arriveDateInput, applyNum, confirmNoteInput, purchasePrice;
    orderId = url.orderId;
    arriveDateInput = req.body.arriveDateInput;
    applyNum = req.body.applyNum
    confirmNoteInput = req.body.confirmNoteInput
    purchasePrice = req.body.purchasePrice

    if(req.body.approveButton){
        if (orderId.toString().substring(0,3) === 'ONE') {
            orderSql = 'SELECT * \n' +
                'FROM orderlist\n' +
                'JOIN item_one\n' +
                'ON orderlist.orderId = item_one.orderId\n' +
                'WHERE orderlist.orderId = ' + '"' + orderId + '";';
            connection.query(orderSql, function (err, order) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                if(!arriveDateInput){arriveDateInput=order[0].commingDate;}
                var modSql = 'UPDATE orderlist SET state = ?,commingDate = ?,totalNum=?,orderDate=?,replyNote=?, price=? WHERE orderId = '+'\''+orderId+'\'';
                var modSqlParams = ['已下单', arriveDateInput,applyNum,dateOutput,confirmNoteInput, purchasePrice];
//改
                connection.query(modSql,modSqlParams,function (err) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                    }
                });
                addNote('采购事件更新',order[0].itemName,orderId,'已下单');
            });
        } else {
            ChangeState(true,'hasOrder',1,url);

            var countSql='SELECT * FROM notification';
            var checksql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+url.orderId+'\'';
            connection.query( checksql,function (err, result0) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }
                connection.query( countSql,function (err, result1) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                    }
                    if(!arriveDateInput){arriveDateInput=result0[0].commingDate;}
                    var modSql = 'UPDATE orderlist SET state = ?,commingDate = ?,totalNum=?,orderDate=?,replyNote=?, price=? WHERE orderId = '+'\''+orderId+'\'';
                    var modSqlParams = ['已下单', arriveDateInput,applyNum,dateOutput,confirmNoteInput, purchasePrice];
//改
                    connection.query(modSql,modSqlParams,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }
                        //更改物料价格
                        var itemId = result0[0].itemId;
                        var modSql = 'UPDATE item SET itemPrice=? WHERE itemId = '+'"'+itemId+'";';
                        var modSqlParams = [req.body.purchasePrice];
                        connection.query(modSql,modSqlParams,function (err) {
                            if(err){
                                console.log('[UPDATE ERROR] - ',err.message);
                                return;
                            }
                            //更新部件价格
                            updateComponentCost(false, itemId);
                        });
                    });

                    ChangeState(true,'hasOrder',1,url);

                    var  addSql = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                    var  addSqlParams = [dateOutput, '采购事件更新','已下单',req.body.applyNum,result0[0].itemId,orderId];
                    //console.log(addSqlParams)
                    connection.query(addSql,addSqlParams,function (err, result) {
                        if(err){
                            console.log('[INSERT ERROR] - ',err.message);
                        }
                    });
                    addNote('采购事件更新',result0[0].itemName,orderId,'已下单')
                });
            });
        }
    }

    if(req.body.confirmButton){
        var modSql = 'UPDATE orderlist SET commingDate = ? WHERE orderId = '+'\''+orderId+'\'';
        var modSqlParams = [req.body.arriveDateInput];
//改
        connection.query(modSql,modSqlParams,function (err, result) {
            if(err){
                console.log('[UPDATE ERROR] - ',err.message);
            }
        });
    }

    function StopOrder(state) {
        var modSql = 'UPDATE orderlist SET state = ? WHERE orderId = '+'\''+orderId+'\'';
        var modSqlParams = [state];
//改
        connection.query(modSql,modSqlParams,function (err) {
            if(err){
                console.log('[UPDATE ERROR] - ',err.message);
            }
        });

        if (orderId.toString().substring(0,3) === 'ONE'){
            orderSql = 'SELECT * \n' +
                'FROM orderlist\n' +
                'JOIN item_one\n' +
                'ON orderlist.orderId = item_one.orderId\n' +
                'WHERE orderlist.orderId = ' + '"' + orderId + '";';
            connection.query(orderSql, function (err, order) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                addNote('采购事件更新',order[0].itemName,orderId,state)
            });
        } else {

            var countSql='SELECT * FROM notification';
            var checksql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+orderId+'\'';
            connection.query( checksql,function (err, result0) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                    return;
                }
                connection.query( countSql,function (err, result1) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                        return;
                    }
                    var  addSql = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                    var  addSqlParams = [dateOutput, '采购事件更新',state,' ',result0[0].itemId,orderId ];
                    connection.query(addSql,addSqlParams,function (err) {
                        if(err){
                            console.log('[INSERT ERROR] - ',err.message);
                        }

                    });
                    addNote('采购事件更新',result0[0].itemName,orderId,state)

                    var checksql='SELECT * FROM orderlist WHERE (state=\'已下单\'OR state=\'申请中\' OR state=\'已到货\' OR state=\'有退回\') AND itemId='+'\''+result0[0].itemId+'\'';
                    connection.query( checksql,function (err, result2) {
                        //console.log("@@@"+result2.length)
                        if(result2.length===0){
                            var modSql = 'UPDATE itemstate SET hasOrder=? WHERE itemId = '+'\''+result0[0].itemId+'\'';
                            var modSqlParams = [0];
    //改
                            connection.query(modSql,modSqlParams,function (err, result) {
                                if(err){
                                    console.log('[UPDATE ERROR] - ',err.message);
                                    return;
                                }
                                addNote('物料事件更新',result0[0].itemName,result0[0].itemId,'取消有订单未处理状态')

                            });
                        }
                    })
                });
            });

        }
    }

    if(req.body.refuseButton){
        var modSql = 'UPDATE orderlist SET replyNote=? WHERE orderId = '+'\''+orderId+'\'';
        var modSqlParams = [req.body.confirmNoteInput];
        //改
        connection.query(modSql,modSqlParams,function (err, result) {
            if(err){
                console.log('[UPDATE ERROR] - ',err.message);
                return;
            }

            StopOrder('已拒绝')
        });


    }

    if(req.body.cancelOrderButton){
        var modSql = 'UPDATE orderlist SET replyNote=? WHERE orderId = '+'\''+orderId+'\'';
        var modSqlParams = [req.body.confirmNoteInput];
        //改
        connection.query(modSql,modSqlParams,function (err, result) {
            if(err){
                console.log('[UPDATE ERROR] - ',err.message);
                return;
            }

            StopOrder('已取消')
        });
    }
    var flashUrl='adOrder?orderId=' +url.orderId;
    res.redirect('flash?url='+flashUrl)

});


/* GET adOrderFix*/
router.get('/adOrderFix', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var orderId, orderSql;

    orderId = url.orderId;

    if (orderId.toString().substring(0,3) === 'ONE') {
        orderSql = 'SELECT * \n' +
            'FROM orderlist\n' +
            'JOIN item_one\n' +
            'ON orderlist.orderId = item_one.orderId\n' +
            'WHERE orderlist.orderId = ' + '"' + orderId + '";';
        connection.query(orderSql, function (err, order) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
                return;
            }
            res.render('adOrderFix', {
                orderList: order,
                user: req.session.user
            });
        });
    } else {
        var orderSql = 'SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.orderId=' + '\'' + orderId + '\'';
        connection.query(orderSql, function (err, order) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            res.render('adOrderFix', {
                orderList: order,
                user: req.session.user
            });
        });
    }
});


router.post('/adOrderFix', function(req, res, next) {
    var url=URL.parse(req.url,true).query;

    var  addSql = 'INSERT INTO record(itemId,type,date,manager,deliver,note,orderId,state,reason,applicant,returnee,num,exitDate,returnNum) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    var  saveDate= new Date();
    var year= parseInt(saveDate.getFullYear()) ;
    var month=parseInt(saveDate.getMonth()+1);
    var day=parseInt(saveDate.getDate());
    var hour=parseInt(saveDate.getHours());
    var min=parseInt(saveDate.getMinutes());
    var sec=parseInt(saveDate.getSeconds());
    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;

    var orderId, orderSql, modSql, modSqlParams, isFirstSQL;
    orderId=url.orderId;

    if (orderId.toString().substring(0,3) === 'ONE') {
        orderSql = 'SELECT * \n' +
            'FROM orderlist\n' +
            'JOIN item_one\n' +
            'ON orderlist.orderId = item_one.orderId\n' +
            'WHERE orderlist.orderId = ' + '"' + orderId + '";';
    } else {
        orderSql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+orderId+'\'';
    }

    connection.query(orderSql,function (err, order) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            return;
        }
        if(req.body.enterModel==='直接退回'){
            if(order[0].totalNum<parseInt( order[0].getNum)+parseInt( order[0].pendingNum)+parseInt( order[0].returnNum)+parseInt(req.body.saveNum) ){
                return  res.send('退回失败：退回数量超出数额。');
            }else{
                modSql = 'UPDATE orderlist SET returnNum = ? WHERE orderId = '+'\''+orderId+'\'';
                modSqlParams = [parseInt( order[0].returnNum)+parseInt(req.body.saveNum) ];
//改
                connection.query(modSql,modSqlParams,function (err) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                    }
                });

                var itemName;
                if (order[0].itemName){
                    itemName = order[0].itemName;
                } else {
                    itemName = order[0].itemOneName;
                }
                OrderState(itemName);

                isFirstSQL='SELECT sum( case when noteState=\'已退回(首次检测)\' or noteState=\'已从临时仓库退回(首次检测)\' then 1 else 0 end) as returnTimes FROM notification WHERE orderId=\''+orderId+'\'';
                connection.query(isFirstSQL,function (err, result2) {
                    if(err){
                        console.log('[SELECT ERROR] - ',err.message);
                        return;
                    }
                    if(result2[0].returnTimes>0){
                        addNotification('已退回',req.body.saveNum);
                    }else{
                        addNotification('已退回(首次检测)',req.body.saveNum);
                    }
                });

                var flashUrl='adOrder?orderId='+url.orderId;
                return res.redirect('flash?url='+flashUrl)
            }
        }else if(req.body.enterModel==='从临时仓库退回'){
            if(req.body.saveNum>order[0].pendingNum){
                return  res.send('退回失败：退回数量超过临时仓库中该物料的数量。');
            }else{
                modSql = 'UPDATE orderlist SET  returnNum=? ,pendingNum = ? WHERE orderId = '+'\''+url.orderId+'\'';
                modSqlParams = [parseInt(order[0].returnNum)+parseInt(req.body.saveNum) ,parseInt(order[0].pendingNum)- parseInt(req.body.saveNum)];
//改

                connection.query(modSql,modSqlParams,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }
                });

                var modSql3='UPDATE item SET itemTemNum=? WHERE itemId='+'\''+order[0].itemId+'\''
                var modSqlParams3 = [parseInt(order[0].itemTemNum)-req.body.saveNum];

                connection.query(modSql3,modSqlParams3,function (err, result) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                        return;
                    }
                });

                if(parseInt(req.body.saveNum)===order[0].pendingNum){
                    var modSql2='UPDATE record SET state = ? WHERE orderId ='+'\''+url.orderId+'\'' ;
                    var modSqlParams2 = ['已处理'];

                    connection.query(modSql2,modSqlParams2,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }

                    });
                }

                var itemName;
                if (order[0].itemName){
                    itemName = order[0].itemName;
                } else {
                    itemName = order[0].itemOneName;
                }
                OrderState(itemName);

                var isFirstSQL = 'SELECT sum( case when noteState=\'已退回(首次检测)\' or noteState=\'已从临时仓库退回(首次检测)\' then 1 else 0 end) as returnTimes FROM notification WHERE orderId=\'' + url.orderId + '\'';
                connection.query(isFirstSQL, function (err, result2) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                        return;
                    }
                    if (result2[0].returnTimes > 0) {
                        addNotification('已从临时仓库退回', req.body.saveNum);
                    } else {
                        addNotification('已从临时仓库退回(首次检测)', req.body.saveNum);
                    }
                });

                var flashUrl='adOrder?orderId='+url.orderId;
                return res.redirect('flash?url='+flashUrl)
            }
        }
    });


    function addNotification(enterModel,addSqlInput) {
        var countSql='SELECT * FROM notification';
        var checkSql='SELECT * \n' +
            'FROM orderlist\n' +
            'LEFT JOIN item\n' +
            'ON orderlist.itemId = item.itemId\n' +
            'LEFT JOIN item_one\n' +
            'ON orderlist.orderId = item_one.orderId\n' +
            'WHERE orderlist.orderId='+'\''+url.orderId+'\'';
        var  itemId;
        connection.query( checkSql,function (err, result0) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            connection.query( countSql,function (err, result1) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }
                var  addSql = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                if (result0[0].itemId){
                    itemId = result0[0].itemId;
                } else {
                    itemId = result0[0].itemOneId;
                }
                var  addSqlParams =[dateOutput, '采购事件更新',enterModel,addSqlInput,itemId,url.orderId ];
                connection.query(addSql,addSqlParams,function (err, result) {
                    if(err){
                        console.log('[INSERT ERROR] - ',err.message);
                        return;
                    }

                });


            });
        });
    }

    function OrderState(itemName) {
        var checksql='SELECT * FROM orderlist WHERE orderId='+'\''+url.orderId+'\'';
        connection.query( checksql,function (err) {
            if(err){
                console.log('[SELECT ERROR] - ',err.message);
            }
                var modSql = 'UPDATE orderlist SET state = ? WHERE orderId = '+'\''+url.orderId+'\'';
                var modSqlParams = ['有退回'];
//改
                connection.query(modSql,modSqlParams,function (err) {
                    if(err){
                        console.log('[UPDATE ERROR] - ',err.message);
                    }
                });
            addNote('采购事件更新',itemName,orderId,'有退回')

        });
    }
});

/* GET adItemOrderEnter*/
router.get('/adItemOrderEnter', function(req, res, next) {

    var url=URL.parse(req.url,true).query;
    var orderId='无（直接进仓）';

    var sql;
    //console.log(url)
    if(url.sql===undefined){
        sql='SELECT *  ,CASE  WHEN state = \'申请中\' OR state = \'已下单\' OR state = \'有退回\' OR (state = \'已到货\' AND getNum+pendingNum != totalNum) THEN 1\n' +
            'WHEN (state = \'已到货\' AND getNum+pendingNum = totalNum) THEN 2\n' +
            'WHEN state = \'已拒绝\'  THEN 3\n' +
            'WHEN state = \'已取消\'  THEN 4\n' +
            'WHEN state = \'已完成\' THEN 5\n' +
            'END AS order_param \n' +
            'FROM orderlist,item\n' +
            'WHERE orderlist.itemId=item.itemId AND item.itemId=' +'\''+url.itemId+'\''+
            'ORDER BY  order_param,commingDate,orderDate ASC';
        //sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId='+'\''+url.itemId+'\''+'  ORDER BY orderlist.orderDate DESC';
    }else {
        sql=url.sql;
    }

    connection.query( sql,function (err, result1) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        getInfo(url,function (err,result) {
            // console.log(result)
            return  res.render('adItemOrderEnter', {
                itemList:result.item,
                itemStateList:result.itemStateList,
                orderId:orderId,
                totalNum:0,
                getNum:0,
                pendingNum:0,
                returnNum:0,
                orderList:result1,
                user:req.session.user
            });
        })

    });

});


router.post('/adItemOrderEnter', function(req, res, next) {
    var sql;
    var stateJudge=req.body.state;
    var url=URL.parse(req.url,true).query;
    let indexOf =  '\'\%%' + req.body.indexOf + '%\'';

    switch (stateJudge) {
        case '0':  sql=undefined; break;
        case '1':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId='+'\''+url.itemId+'\''+' AND orderlist.state=\'已下单\' ORDER BY orderlist.orderDate DESC'; break;
        case '2':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId= '+'\''+url.itemId+'\''+'AND orderlist.state=\'申请中\' ORDER BY orderlist.orderDate DESC'; break;
        case '3':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId= '+'\''+url.itemId+'\''+'AND orderlist.state=\'已拒绝\' ORDER BY orderlist.orderDate DESC'; break;
        case '4':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId= '+'\''+url.itemId+'\''+'AND orderlist.state=\'已到货\' ORDER BY orderlist.orderDate DESC'; break;
        case '5':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId= '+'\''+url.itemId+'\''+'AND orderlist.state=\'有退回\' ORDER BY orderlist.orderDate DESC'; break;
        case '6':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId= '+'\''+url.itemId+'\''+'AND orderlist.state=\'已完成\' ORDER BY orderlist.orderDate DESC'; break;
        case '7':  sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId= '+'\''+url.itemId+'\''+'AND orderlist.state=\'已取消\' ORDER BY orderlist.orderDate DESC'; break;

    }


    //console.log(indexOf);

    if(req.body.indexOfButton){

        sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId='+'\''+url.itemId+'\''+' AND (orderlist.orderId Like' +indexOf+' OR item.itemName Like '+indexOf+' OR item.itemId Like '+indexOf+' OR orderlist.applyNote Like '+indexOf+' OR orderlist.replyNote Like '+indexOf+')';
    }
    switch (req.body.order) {
        case '0':sql=undefined;break
        case '1':sql='sql=SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId='+'\''+url.itemId+'\''+' ORDER BY orderlist.orderDate DESC';break
    }


    //console.log(sql);


    var returnURL = '/adItemOrderEnter?' +sql+'&itemId='+url.itemId;
    res.redirect(returnURL)
});

/* GET adItemOrder*/
router.get('/adItemOrder', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var orderId='无（直接进仓）';
    getInfo(url,function (err,result) {
        // console.log(result)
        return  res.render('adItemOrder', {
            itemList:result.item,
            itemStateList:result.itemStateList,
            orderId:orderId,
            totalNum:0,
            getNum:0,
            pendingNum:0,
            returnNum:0,
            user:req.session.user
        });
    });

});


/* POST adItemOrder*/
router.post('/adItemOrder', function(req, res, next) {
    //增
    var url=URL.parse(req.url,true).query;
    var  saveDate= new Date();
    var year= saveDate.getFullYear();
    var month=saveDate.getMonth()+1;
    var day=saveDate.getDate();
    var hour=saveDate.getHours();
    var min=saveDate.getMinutes();
    var sec=saveDate.getSeconds();
    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
    var checkSql='SELECT orderId FROM orderlist WHERE orderId LIKE '+'"%'+year.toString()+month.toString() +day.toString()+'%"' + ' OR orderId LIKE '+'"%'+ 'ONE'+year.toString()+month.toString() +day.toString()+'%"';

    connection.query( checkSql,function (err, result1) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }
        var addId;
       // console.log(result1)
        if(result1.length===0){
            addId=1;
        }else {
            addId=result1.length+1;
        }
        var prefixId;
        var orderId;
        if(addId<10){
            prefixId='00';
            orderId=year.toString()+month.toString() +day.toString()+prefixId+addId;
        }else if(addId<100&&addId>=10){
            prefixId='0';
            orderId=year.toString()+month.toString() +day.toString()+prefixId+addId;
        }else{
            orderId=year.toString()+month.toString() +day.toString()+addId;
        }
        //console.log(orderId)

        var  addSql = 'INSERT INTO orderlist(orderId,state,applyDate,orderDate,commingDate,itemId,applyNote,replyNote,applier,totalNum,getNum,pendingNum,returnNum) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)';
        var  addSqlParams = [orderId,'申请中',dateOutput,dateOutput,req.body.commingDate,url.itemId,req.body.applyNote,'',req.body.applier,req.body.num,0,0,0];
        connection.query(addSql,addSqlParams,function (err, result) {
            if(err){
                console.log('[INSERT ERROR] - ',err.message);
                return;
            }

            var countSql='SELECT * FROM notification';
            var checksql='SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND item.itemId='+'\''+url.itemId+'\'';
            connection.query( checksql,function (err, result0) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }
                connection.query( countSql,function (err, result2) {
                    if (err) {
                        console.log('[SELECT ERROR] - ', err.message);
                    }

                    var  addSql1 = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                    var  addSqlParams1 = [dateOutput, '采购事件更新','申请中',req.body.num,url.itemId,orderId ];
                    //console.log(addSqlParams)
                    connection.query(addSql1,addSqlParams1,function (err, result) {
                        if(err){
                            console.log('[INSERT ERROR] - ',err.message);
                            return;
                        }
                    });

                    if(result0[0].hasOrder===0){
                        addNote('物料事件更新',result0[0].itemName,result0[0].itemId,'有订单未处理')
                    }

                    addNote('采购事件更新',result0[0].itemName,orderId,'申请中')
                    ChangeState(true,'hasOrder',1,url);

                });
            });
        });

        return res.redirect('adItemOrderEnter?itemId='+url.itemId);

    });
});

/*                            ***************************************************一次性订单***************************************************                  */
router.get('/adItemOrderOne', function(req, res) {
    res.render('adItemOrderOne', {
        user:req.session.user
    });
});

router.post('/adItemOrderOne', function (req, res) {
    var saveDate = new Date();
    var year = saveDate.getFullYear();
    var month = saveDate.getMonth() + 1;
    var day = saveDate.getDate();
    var hour = saveDate.getHours();
    var min = saveDate.getMinutes();
    var sec = saveDate.getSeconds();
    var dateOutput = year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;
    var checkSql = 'SELECT orderId FROM orderlist WHERE orderId LIKE ' + '"%' + year.toString() + month.toString() + day.toString() + '%"' + ' OR orderId LIKE ' + '"%' + 'ONE' + year.toString() + month.toString() + day.toString() + '%"';

    var state, applyDate, orderDate, commingDate, applyNote, replyNote, applier, itemSize, itemModel, itemName,
        itemSupplier, totalNum, itemPrice, itemUnit;

    applyDate = dateOutput;
    commingDate = req.body.commingDate;
    applyNote = req.body.applyNote;
    applier = req.body.applier;
    itemSize = req.body.itemSize;
    itemModel = req.body.itemModel;
    itemName = req.body.itemName;
    itemSupplier = req.body.itemSupplier;
    totalNum = req.body.applyNum;
    itemPrice = req.body.itemPrice;
    itemUnit = req.body.itemUnit;

    state = '申请中';
    orderDate = dateOutput;
    replyNote = '';


    var fistzmName = pinyin(itemName, {style: pinyin.STYLE_FIRST_LETTER}).toString();
    var itemNameFinal = fistzmName.replace(new RegExp(",", 'g'), "").toUpperCase();

    var fistzmSize = pinyin(itemSize, {style: pinyin.STYLE_FIRST_LETTER}).toString();
    var fistzmSizeFinal = fistzmSize.replace(new RegExp(",", 'g'), "").toUpperCase();

    var itemIdFinal = itemNameFinal + fistzmSizeFinal + '-ONCE';

    if (itemModel === "") {
        itemModel = itemIdFinal;
    }
    if (itemPrice === "") {
        itemPrice = 0;
    }

    connection.query(checkSql, function (err, result1) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        var addId;
        if (result1.length === 0) {
            addId = 1;
        } else {
            addId = result1.length + 1;
        }
        var prefixId;
        var orderId;
        if (addId < 10) {
            prefixId = '00';
            orderId = 'ONE' + year.toString() + month.toString() + day.toString() + prefixId + addId;
        } else if (addId < 100 && addId >= 10) {
            prefixId = '0';
            orderId = 'ONE' + year.toString() + month.toString() + day.toString() + prefixId + addId;
        } else {
            orderId = 'ONE' + year.toString() + month.toString() + day.toString() + addId;
        }

        var addOrderSql = 'INSERT INTO orderlist(orderId,state,applyDate,orderDate,commingDate,itemId,applyNote,replyNote,applier,totalNum,getNum,pendingNum,returnNum,price) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
        var addOrderSqlParams = [orderId, state, applyDate, orderDate, commingDate, itemIdFinal, applyNote, replyNote, applier, totalNum, 0, 0, 0, itemPrice];

        connection.query(addOrderSql, addOrderSqlParams, function (err) {
            if (err) {
                console.log('[INSERT ERROR] - ', err.message);
            }
            let addItemSql = 'INSERT INTO item_one(itemId, itemModel, itemName, itemSupplier, itemUnit, orderId) VALUES (?,?,?,?,?,?)';
            let addItemSqlParams = [itemIdFinal, itemModel, itemName, itemSupplier, itemUnit, orderId];
            connection.query(addItemSql, addItemSqlParams, function (err) {
                if (err) {
                    console.log('[INSERT ERROR] - ', err.message);
                    return;
                }

                var addSql1 = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                var addSqlParams1 = [dateOutput, '采购事件更新', '申请中', totalNum, itemIdFinal, orderId];
                connection.query(addSql1, addSqlParams1, function (err) {
                    if (err) {
                        console.log('[INSERT ERROR] - ', err.message);
                    }
                });

                addNote('采购事件更新', itemName, orderId, '申请中');
            });
        });
    });

    var flashUrl = '/adOrderMan';
    res.redirect('flash?url=' + flashUrl);
});


/* GET flash*/
router.get('/flash', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    res.render('flash', {
        url:url.url
    });
});



router.get('/adUser', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var  sql = 'SELECT * FROM user WHERE userId='+'\''+url.userId+'\''; //select id,name From websites=rowDataPacket{id,name}
    connection.query(sql,function (err, result) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            res.send(err);
        }
        res.render('adUser', {
            userList:result,
            user:req.session.user
        });
    });
});


router.post('/adUser', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var  updateSql = 'UPDATE user SET role=? , post=? , contact=? , state=? WHERE userId = \''+url.userId+'\''; //select id,name From websites=rowDataPacket{id,name}
    var updateData=[req.body.updateRole,req.body.updatePost,req.body.updateContact,req.body.updateState];
    console.log(updateData)
    connection.query(updateSql,updateData,function (err, result) {
        if(err){
            console.log('[UPDATE ERROR] - ',err.message);
            res.send(err);
        }
    });
    var flashUrl='adUser?userId='+url.userId;
    res.redirect(flashUrl)
});



/*                            ***************************************************物料分类增删改查***************************************************                  */
//   ---增加分类---
/* GET adItemTypeAdd Page */
router.get('/adItemTypeAdd', function(req, res) {
    res.render('adItemTypeAdd', {user: req.session.user,})
});
/* POST adItemTypeAdd Page */
router.post('/adItemTypeAdd', function (req, res) {
    let unique = true;
    let addItemTypeName = req.body.addItemTypeName
    let checkItemTypeNameSQL = 'SELECT * FROM itemtype WHERE itemTypeName= '+'\''+ addItemTypeName + '\'';

    connection.query(checkItemTypeNameSQL, function (err, checkResult) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        if (checkResult.length !== 0) {
            unique = false;
            return res.send('分类添加失败：您所添加的分类【分类名称】已存在于分类列表中。')
        } else if (unique) {
            let addSql = 'INSERT INTO itemtype(itemTypeName) VALUES(?)';
            let  addSqlParams = [addItemTypeName];

            connection.query(addSql,addSqlParams, function (err) {
                if (err) {
                    console.log('[INSERT ERROR] - 添加新物料分类错误！ \n', err.message);
                    res.send('[INSERT ERROR] - 添加新物料分类错误！ \n' + err.message);
                }
            });

        }
        return res.redirect('/adItemTypeMan')
    });
});

//   ---删除分类---
/* GET adItemTypeDelete Page */
router.get('/adItemTypeDelete', function(req, res) {
    let url=URL.parse(req.url,true).query;
    let delSql = 'DELETE FROM itemtype WHERE itemTypeId = '+'\''+url.itemTypeId+'\'';
    connection.query(delSql,function (err) {
        if(err){
            console.log('[DELETE ERROR] - 删除物料分类错误！ \n',err.message);
            res.send('[DELETE ERROR] - 删除物料分类错误！ \n' + err.message);
            return;
        }
        res.redirect('/adItemTypeMan')
    });
});

//   ---修改分类---
/* GET adItemTypeEdit Page */
router.get('/adItemTypeEdit', function(req, res) {
    let url=URL.parse(req.url,true).query;
    let sql = 'SELECT * FROM itemtype WHERE itemTypeId = '+'\''+url.itemTypeId+'\'';

    connection.query(sql,function (err,result) {
        if(err){
            console.log('[SELECT ERROR] - ',err.message);
            res.send(err);
            return;
        }
        res.render('adItemTypeEdit', {
            user: req.session.user,
            itemType: result[0]
        })
    });
});
/* POST adItemTypeEdit Page */
router.post('/adItemTypeEdit', function(req, res) {
    let url=URL.parse(req.url,true).query;
    let editItemTypeName = req.body.editItemTypeName
    let modSql = 'UPDATE itemtype SET itemTypeName = ? WHERE itemTypeId = '+'\''+url.itemTypeId+'\'';
    let modSqlParams = [editItemTypeName];
    let unique = true;
    let checkItemTypeNameSQL = 'SELECT * FROM itemtype WHERE itemTypeName= '+'\''+ editItemTypeName + '\'';

    connection.query(checkItemTypeNameSQL, function (err, checkResult) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        if (checkResult.length !== 0) {
            unique = false;
            return res.send('分类修改失败：您所修改的分类【分类名称】已存在于分类列表中。')
        } else if (unique) {
            connection.query(modSql, modSqlParams, function (err) {
                if (err) {
                    console.log('[UPDATE ERROR] - ', err.message);
                    res.send(err);
                    return;
                }
                res.redirect('/adItemTypeMan')
            });
        }
    });
});

//   ---查找分类---
/* GET adItemTypeMan*/
router.get('/adItemTypeMan', function(req, res) {
    let sql = 'SELECT * FROM itemtype';
    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        res.render('adItemTypeMan', {
            user: req.session.user,
            itemType: result
        })
    });
});


router.get('/qrCodeTest', function(req, res) {

        res.render('qrCodeTest', {

        })
});






/* GET adItemSupplierCheck
router.get('/adItemSupplierCheck', function(req, res, next) {
    var url=URL.parse(req.url,true).query;


    var sql;
    //console.log(url)
    if(url.sql===undefined){
        sql='select table1.supplier,table1.totalEnter,table1.totalExit,table1.rentingNum,table1.totalPenNum,table2.returnNum,table2.DATEDIFF,table3.totalOrderNum,table3.orderTimes\n' +
            'from (select  supplier, \n' +
            'sum(case when record.type=\'进仓\' then num else 0 end) as totalEnter,\n' +
            'sum(case when record.type=\'出仓\' AND  state=\'null\' then num else 0 end) as totalExit,\n' +
            'sum(case when record.type=\'出仓\' AND state=\'未处理\' then num else 0 end) as rentingNum,\n' +
            'sum(case when record.type=\'临时进仓\' AND state=\'未处理\' then num else 0 end) as totalPenNum\t\n' +
            'from storagedb.record WHERE record.itemId=\''+url.itemId+'\'\n' +
            'group by supplier ) as table1\n' +
            'left join (SELECT orderList.supplier,\n' +
            'sum(CASE WHEN orderList.state=\'已完成\' AND (notification.noteState=\'已退回(首次检测)\' or notification.noteState=\'已从临时仓库退回(首次检测)\')  then notification.noteContent else 0 end ) as returnNum,\n' +
            'sum(case when notification.notestate=\'已完成\' AND DATEDIFF(orderList.arriveDate,orderList.commingDate)>0 then 1 else 0 end) AS DATEDIFF\n' +
            'FROM storagedb.notification,storagedb.orderList \n' +
            'WHERE notification.orderId=orderList.orderId AND orderList.itemId=\''+url.itemId+'\'\n' +
            'group by orderList.supplier ) as table2\n' +
            'on table1.supplier=table2.supplier\n' +
            'left join (SELECT supplier, sum(case when state=\'已完成\' then totalNum else 0 end) as totalOrderNum,sum(case when state=\'已完成\' AND itemId=\''+url.itemId+'\' then 1 else 0 end) as orderTimes \n' +
            'FROM storagedb.orderlist WHERE itemId=\''+url.itemId+'\'\n' +
            'group by supplier) AS table3\n' +
            'on table2.supplier=table3.supplier\n'+
            'order by CONVERT( table1.supplier USING gbk ) COLLATE gbk_chinese_ci ASC';
        //sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND item.itemId='+'\''+url.itemId+'\''+'  ORDER BY orderlist.orderDate DESC';
    }else {
        sql=url.sql;
    }

    connection.query( sql,function (err, result1) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }

        getInfo(url,function (err,result) {
            // console.log(result)
            return  res.render('adItemSupplierCheck', {
                itemList:result.item,
                itemStateList:result.itemStateList,
                supplierList:result1,
                user:req.session.user
            });
        })

    });
});


router.post('/adItemSupplierCheck', function(req, res, next) {
    var sql;
    var stateJudge=req.body.state;
    var url=URL.parse(req.url,true).query;
    var originalSql='sql=select table1.supplier,table1.totalEnter,table1.totalExit,table1.rentingNum,table1.totalPenNum,table2.returnNum,table2.DATEDIFF,table3.totalOrderNum,table3.orderTimes\n' +
        'from (select  supplier, \n' +
        'sum(case when record.type=\'进仓\' then num else 0 end) as totalEnter,\n' +
        'sum(case when record.type=\'出仓\' AND  state=\'null\' then num else 0 end) as totalExit,\n' +
        'sum(case when record.type=\'出仓\' AND state=\'未处理\' then num else 0 end) as rentingNum,\n' +
        'sum(case when record.type=\'临时进仓\' AND state=\'未处理\' then num else 0 end) as totalPenNum\t\n' +
        'from storagedb.record WHERE record.itemId=\''+url.itemId+'\'\n' +
        'group by supplier ) as table1\n' +
        'left join (SELECT orderList.supplier,\n' +
        'sum(CASE WHEN orderList.state=\'已完成\' AND (notification.noteState=\'已退回(首次检测)\' or notification.noteState=\'已从临时仓库退回(首次检测)\')  then notification.noteContent else 0 end ) as returnNum,\n' +
        'sum(case when notification.notestate=\'已完成\' AND DATEDIFF(orderList.arriveDate,orderList.commingDate)>0 then 1 else 0 end) AS DATEDIFF\n' +
        'FROM storagedb.notification,storagedb.orderList \n' +
        'WHERE notification.orderId=orderList.orderId AND orderList.itemId=\''+url.itemId+'\'\n' +
        'group by orderList.supplier ) as table2\n' +
        'on table1.supplier=table2.supplier\n' +
        'left join (SELECT supplier, sum(case when state=\'已完成\' then totalNum else 0 end) as totalOrderNum,sum(case when state=\'已完成\' AND itemId=\''+url.itemId+'\' then 1 else 0 end) as orderTimes \n' +
        'FROM storagedb.orderlist WHERE itemId=\''+url.itemId+'\'\n' +
        'group by supplier) AS table3\n' +
        'on table2.supplier=table3.supplier\n'
    switch (stateJudge) {
        case '0':  sql=originalSql+'order by CONVERT( table1.supplier USING gbk ) COLLATE gbk_chinese_ci ASC'; break;
        case '1':  sql=originalSql+'order by table1.totalEnter DESC, CONVERT( table1.supplier USING gbk ) COLLATE gbk_chinese_ci ASC'; break;
        case '2':  sql=originalSql+'order by table1.totalExit DESC, CONVERT( table1.supplier USING gbk ) COLLATE gbk_chinese_ci ASC'; break;
        case '3':  sql=originalSql+'order by table2.returnNum DESC, CONVERT( table1.supplier USING gbk ) COLLATE gbk_chinese_ci ASC'; break;
        case '4':  sql=originalSql+'order by table2.DATEDIFF DESC, CONVERT( table1.supplier USING gbk ) COLLATE gbk_chinese_ci ASC'; break;

    }


    //console.log(sql);


    var returnURL = '/adItemSupplierCheck?' +sql+'&itemId='+url.itemId;
    res.redirect(returnURL)
});
*/





module.exports = router;
