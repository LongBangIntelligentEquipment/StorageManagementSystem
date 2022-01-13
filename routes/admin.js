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
    var sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId='+'\''+url.itemId+'\'';

    var orderId = url.orderId;
    if (orderId.toString().substring(0,3) === 'ONE') {
        sql = 'SELECT * \n' +
            'FROM orderlist\n' +
            'JOIN item_one\n' +
            'ON orderlist.orderId = item_one.orderId\n' +
            'WHERE orderlist.orderId = ' + '"' + orderId + '";';}

    //console.log(url)


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
//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//
//-----------------------------------------------------------------------------//


/* GET home page. */
router.get('/adminHome', function(req, res, next) {

    var sql='SELECT * FROM homenote ORDER BY date DESC';
    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }
        //console.log(result)
        res.render('adminHome', {
            noteList: result,
            user:req.session.user
        });
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
    var sql;
    var url=URL.parse(req.url,true).query;
    //console.log(url)
    if(url.sql===undefined){
        sql='SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0 THEN 1\n' +
            'END AS order_param \n' +
            'FROM itemstate, item\n' +
            'WHERE itemstate.itemId=item.itemId\n' +
            'ORDER BY  order_param,item.itemName ASC ';
        //sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId ORDER BY item.itemArea';
    }else {
        sql=url.sql;
    }

    //console.log(sql)
    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }


        //console.log(result);
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

        //console.log(statesList)
        res.render('adItemMan', {
            itemList:result,
            itemStateList:statesList,
            user:req.session.user
        });

    });
});




router.post('/adItemMan', function(req, res,){
    var sql;
    var typeJudge=req.body.type;
    var alarmJudge=req.body.alarm;
    let indexOf =  '\'\%%' + req.body.indexOf + '%\'';

    switch (typeJudge) {
        case '0':  sql=undefined; break;
        case '1':  sql='sql=SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0  THEN 1\n' +
            'END AS order_param \n ' +
            'FROM itemstate, item\n' +
            'WHERE itemstate.itemId=item.itemId AND itemType=\'光机类\'\n' +
            'ORDER BY  order_param,item.itemId,itemArea ASC'; break;
        case '2':  sql='sql=SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0  THEN 1\n' +
            'END AS order_param \n ' +
            'FROM itemstate, item\n' +
            'WHERE itemstate.itemId=item.itemId AND itemType=\'电气类\'\n' +
            'ORDER BY  order_param,item.itemId,itemArea ASC'; break;
        case '3':  sql='sql=SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0  THEN 1\n' +
            'END AS order_param \n ' +
            'FROM itemstate, item\n' +
            'WHERE itemstate.itemId=item.itemId AND itemType=\'钣金类\'\n' +
            'ORDER BY  order_param,item.itemId,itemArea ASC'; break;
        case '4':  sql='sql=SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0  THEN 1\n' +
            'END AS order_param \n ' +
            'FROM itemstate, item\n' +
            'WHERE itemstate.itemId=item.itemId AND itemType=\'铸件类\'\n' +
            'ORDER BY  order_param,item.itemId,itemArea ASC'; break;
        case '5':  sql='sql=SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND needReturn = 0  THEN 1\n' +
            'END AS order_param \n ' +
            'FROM itemstate, item\n' +
            'WHERE itemstate.itemId=item.itemId AND itemType=\'其它类\'\n' +
            'ORDER BY  order_param,item.itemId,itemArea ASC'; break;
    }

    switch (alarmJudge) {
        case '0':  sql=undefined; break;
        case '1':  sql='sql=SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND itemstate.hasOrder=0 AND itemstate.lessRest=0 AND itemstate.hasUncheck=0 AND itemstate.needReturn = 0  ORDER BY item.itemId,item.itemArea'; break;
        case '2':  sql='sql=SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND itemstate.hasUncheck=1 ORDER BY item.itemId,item.itemArea'; break;
        case '3':  sql='sql=SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND itemstate.lessRest=1 ORDER BY item.itemId,item.itemArea'; break;
        case '4':  sql='sql=SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND itemstate.hasOrder=1 ORDER BY item.itemId,item.itemArea'; break;
        case '5':  sql='sql=SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND itemstate.needReturn=1 ORDER BY item.itemId,item.itemArea'; break;
    }

    //console.log(indexOf);

    if(req.body.indexOfButton){
        sql='sql=SELECT *  ,CASE  WHEN hasOrder = 0 AND lessRest = 0 AND hasUncheck = 0 AND itemstate.needReturn = 0  THEN 1\n' +
            'END AS order_param \n ' +
            'FROM itemstate, item\n' +
            'WHERE itemstate.itemId=item.itemId AND (item.itemName Like' +indexOf+' OR item.itemId Like '+indexOf+' OR item.itemModel Like '+indexOf+' OR item.itemSupplier Like '+indexOf+' OR item.itemArea Like '+indexOf+' OR item.itemNote Like '+indexOf+')' +
            'ORDER BY  order_param,item.itemName ASC';

        //sql='sql=SELECT * FROM item,itemstate WHERE item.itemId=itemstate.itemId AND (item.itemName Like' +indexOf+' OR item.itemId Like '+indexOf+' OR item.itemNote Like '+indexOf+')';
    }

    var returnURL = '/adItemMan?' +sql ;
    res.redirect(returnURL)

});






/* GET  itemPage. */
router.get('/adItem', function(req, res, next) {
    var statesCounter;
    var states=[];
    var statesList=[];
    var url=URL.parse(req.url,true).query;
    var sql1='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId='+'\''+url.itemId+'\'';
    var sql2=';SELECT * FROM record WHERE itemId='+'\''+url.itemId+'\''+'ORDER BY date DESC';
    var sql;
    //console.log(url)
    if(url.sql===undefined || url.sql==='undefined'){
        sql=sql1+sql2;
    } else {
        sql=url.sql;
    }


    //console.log(url);
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


        var  sql2 = 'SELECT * FROM item, itemstate WHERE item.itemId=itemstate.itemId AND item.itemId='+'\''+url.itemId+'\''; //select id,name From websites=rowDataPacket{id,name}
        connection.query(sql2,function (err, result) {
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

        res.render('adItem', {
            item:result[0],
            itemStateList:statesList,
            recordList:result[1],
            user:req.session.user

        });

    });

});


//如果一直出现500报错信息 Node Multer unexpected field 则需要如此操作

router.post('/adItem', upload.single('updateFileName'), function(req, res, next) {

    var url=URL.parse(req.url,true).query;
    var sql;
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
                        updateTypeFinal=result0[0].itemType;
                    }

                    if(req.body.updateId===undefined){
                        if(req.file===undefined){//仓管编辑
                            originalSql1='UPDATE item SET itemName=?, itemId=?, itemType=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=? , itemSupplier=?, itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                            updateJson1=[result0[0].itemName,result0[0].itemId,updateTypeFinal,req.body.updateArea,req.body.updateAlarmSetting,req.body.updateNote,result0[0].itemModel,updatesupplierFinal,req.body.updateUnit];
                            if(req.body.updateArea===undefined){  //技术员编辑
                                originalSql1='UPDATE item SET itemName=?, itemId=?, itemType=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=? , itemSupplier=?, itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                                updateJson1=[req.body.updateName,result0[0].itemId,updateTypeFinal,result0[0].itemArea,result0[0].itemAlarmSetting,req.body.updateNote,req.body.updateModel,updatesupplierFinal,result0[0].itemUnit];
                            }
                        }else{
                            originalSql1='UPDATE item SET itemName=?, itemId=?, itemType=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=?, itemFileName=?, itemSupplier=? ,itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                            updateJson1=[result0[0].itemName,result0[0].itemId,updateTypeFinal,req.body.updateArea,req.body.updateAlarmSetting,req.body.updateNote,result0[0].itemModel,req.file.filename,updatesupplierFinal,req.body.updateUnit];
                            if(req.body.updateArea===undefined){
                                originalSql1='UPDATE item SET itemName=?, itemId=?, itemType=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=?, itemFileName=?, itemSupplier=? ,itemUnit=? WHERE itemId = \''+url.itemId+'\'';
                                updateJson1=[result0[0].itemName,result0[0].itemId,updateTypeFinal,result0[0].itemArea,result0[0].itemAlarmSetting,req.body.updateNote,req.body.updateModel,req.file.filename,updatesupplierFinal,result0[0].itemUnit];

                            }
                        }
                    }else{
                        if(req.file===undefined){//系统管理员编辑
                            originalSql1='UPDATE item SET itemName=?, itemId=?, itemType=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=?,itemSupplier=?,itemUnit=?, itemPrice=? WHERE itemId = \''+url.itemId+'\'';
                            updateJson1=[req.body.updateName,req.body.updateId,updateTypeFinal,req.body.updateArea,req.body.updateAlarmSetting,req.body.updateNote,req.body.updateModel,updatesupplierFinal,req.body.updateUnit,req.body.updatePrice];
                        }else{
                            originalSql1='UPDATE item SET itemName=?, itemId=?, itemType=?, itemArea=?, itemAlarmSetting=?, itemNote=? ,itemModel=?, itemFileName=?,itemSupplier=?,itemUnit=?, itemPrice=? WHERE itemId = \''+url.itemId+'\'';
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







    }else{
        switch (typeJudge) {
            case '0':  sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\''+url.itemId+'\';SELECT * FROM record WHERE itemId=\''+url.itemId+'\''+'ORDER BY date DESC'; break;
            case '1':  sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\''+url.itemId+'\';SELECT * FROM record WHERE itemId=\''+url.itemId+'\' AND type=\'进仓\''+'ORDER BY date DESC'; break;
            case '2':  sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\''+url.itemId+'\';SELECT * FROM record WHERE itemId=\''+url.itemId+'\' AND type=\'出仓\''+'ORDER BY date DESC'; break;
            case '3':  sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\''+url.itemId+'\';SELECT * FROM record WHERE itemId=\''+url.itemId+'\' AND type=\'临时进仓\''+'ORDER BY date DESC'; break;
            case '4':  sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\''+url.itemId+'\';SELECT * FROM record WHERE itemId=\''+url.itemId+'\' AND type=\'归还进仓\''+'ORDER BY date DESC'; break;
        }


        //console.log(indexOf);

        if(req.body.dateButton){
            sql='SELECT * FROM item,itemstate where item.itemId=itemstate.itemId AND item.itemId=\''+url.itemId+'\';SELECT * FROM record WHERE itemId=\''+url.itemId+'\'AND date LIKE'+indexOf+'ORDER BY date DESC';
        }




        var returnURL = '/adItem?sql='+sql+'&itemId='+url.itemId+'&returnSql='+url.returnSql+'&itemModel='+url.itemModel;
        console.log(returnURL)
        return  res.redirect(returnURL)
    }

});






/* GET  itemAddPage. */
router.get('/adItemAdd', function(req, res, next) {
    res.render('adItemAdd', {user:req.session.user });
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

        var pinstrType=req.body.addType;
        var fistzmType=pinyin(pinstrType,{style:pinyin.STYLE_FIRST_LETTER}).toString();
        var itemTypeFinal= fistzmType.replace(new RegExp(",",'g'),"").substr(0,1).toUpperCase();


        var pinstrSize=req.body.addSize;
        var fistzmSize=pinyin(pinstrSize,{style:pinyin.STYLE_FIRST_LETTER}).toString();
        var fistzmSizeFinal=fistzmSize.replace(new RegExp(",",'g'),"").toUpperCase();

        var itemIdFinal=itemNameFinal+fistzmSizeFinal+'-'+itemTypeFinal+'-'+( "00000000" + (parseInt(result.length)+1) ).substr( -5 ) ;
        var addModelFinal =req.body.addModel;
        console.log('!!!!!'+fistzmSizeFinal,pinstrSize,fistzmSize)
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

                    var  addSql1 = 'INSERT INTO item(itemId,itemName,itemType,itemNum,itemTemNum,itemUnit,itemArea,itemAlarmSetting,itemNote,itemFileName,itemModel,itemSupplier,itemPrice) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)';
                   // console.log((req.body.addPrice === "" ? 0:1 ) )

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

    console.log(sql)
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

    //console.log('asasad'+addSqlParams)



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
            addNotification('已临时进仓',req.body.saveNum);
        }

        OrderState(orderItem[0].itemName);

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
        var checksql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+url.orderId+'\'';
        connection.query( checksql,function (err, result0) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            connection.query( countSql,function (err, result1) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }
                var  addSql = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                var  addSqlParams =[dateOutput, '采购事件更新',enterModel,addSqlInput,result0[0].itemId,url.orderId ];
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
                        addNotification('已进仓',req.body.saveNum);
                    }

                    OrderCompeleted(result1[0].itemName);


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
                    var modSql3='UPDATE item SET itemTemNum=? WHERE itemId='+'\''+result1[0].itemId+'\''
                    var modSqlParams3 = [parseInt(result1[0].itemTemNum)-req.body.saveNum];

                    connection.query(modSql3,modSqlParams3,function (err, result) {
                        if(err){
                            console.log('[UPDATE ERROR] - ',err.message);
                            return;
                        }

                    });

                    if (url.orderId.toString().substring(0,3) !== 'ONE') {
                        itemEnter();
                        addNotification('已验收进仓',req.body.saveNum);
                    }

                    OrderCompeleted(result1[0].itemName);

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
                        addNotification('已退还进仓',req.body.saveNum);
                    }

                    OrderCompeleted(result1[0].itemName);


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
        var checksql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderId='+'\''+url.orderId+'\'';
        connection.query( checksql,function (err, result0) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            connection.query( countSql,function (err, result1) {
                if (err) {
                    console.log('[SELECT ERROR] - ', err.message);
                }
                var  addSql = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                var  addSqlParams =[dateOutput, '采购事件更新',enterModel,addSqlInput,result0[0].itemId,url.orderId ];
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
        connection.query( checksql,function (err, result) {
            if(result[0].totalNum===result[0].getNum){
                var modSql;
                var modSqlParams;
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
                var checksql='SELECT * FROM orderlist WHERE (state=\'已下单\'OR state=\'申请中\' OR state=\'已到货\' OR state=\'有退回\') AND itemId='+'\''+result[0].itemId+'\'';
                connection.query( checksql,function (err, result2) {

                    if(parseInt(result2.length)===0){
                        ChangeState(true,'hasOrder',0,url);
                        addNote('物料事件更新',itemName,result[0].itemId,'取消有订单未处理状态')
                    }
                })

                addNotification('已完成', ' ')
                addNote('采购事件更新',itemName,url.orderId,'已完成')

            }else{
                if(parseInt(result[0].returnNum) ===0){
                        var modSql = 'UPDATE orderlist SET state = ? WHERE orderId = '+'\''+url.orderId+'\'';
                        var modSqlParams = ['已到货'];
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
        // console.log(result)
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
    var sql='SELECT orderlist.orderId, state, applyDate, commingDate, orderDate, item.itemId, item.itemModel, item.itemName, applyNote, replyNote, orderlist.totalNum, item_one.itemSupplier AS oneItemSupplier, item.itemSupplier, item_one.itemName AS oneItemName, item_one.itemModel AS oneItemModel,\n' +
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
        'ORDER BY  order_param,commingDate DESC,orderDate ASC;'

    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }
        res.render('adOrderMan', {
            orderList:result,
            user:req.session.user
        });
    });
});

router.post('/adOrderMan', function(req, res, next) {
    var sql;
    var stateJudge=req.body.state;
    let indexOf =  '\'\%%' + req.body.indexOf + '%\'';

    switch (stateJudge) {
        case '0':  sql=undefined; break;
        case '1':  sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'已下单\' ORDER BY orderlist.orderDate DESC'; break;
        case '2':  sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'申请中\' ORDER BY orderlist.orderDate DESC'; break;
        case '3':  sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'已拒绝\' ORDER BY orderlist.orderDate DESC'; break;
        case '4':  sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'已到货\' ORDER BY orderlist.orderDate DESC'; break;
        case '5':  sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'有退回\' ORDER BY orderlist.orderDate DESC'; break;
        case '6':  sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'已完成\' ORDER BY orderlist.orderDate DESC'; break;
        case '7':  sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND orderlist.state=\'已取消\' ORDER BY orderlist.orderDate DESC'; break;

    }


    if(req.body.indexOfButton){

        sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId AND (orderlist.orderId Like' +indexOf+' OR item.itemName Like '+indexOf+' OR item.itemId Like '+indexOf+' OR item.itemSupplier Like '+indexOf+' OR orderlist.applyNote Like '+indexOf+' OR orderlist.replyNote Like '+indexOf+')';
    }

    switch (req.body.order) {
        case '0':sql=undefined;break
        case '1':sql='SELECT * FROM orderlist,item WHERE orderlist.itemId=item.itemId  ORDER BY orderlist.orderDate DESC';break
    }

    connection.query( sql,function (err, result) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }
        res.render('adOrderMan', {
            orderList:result,
            user:req.session.user
        });
    });

});


/* GET adOrder*/
router.get('/adOrder', function(req, res, next) {
    var url=URL.parse(req.url,true).query;
    var sql, orderId;
    orderId = url.orderId;

    if (orderId.toString().substring(0,3) === 'ONE') {
        sql = 'SELECT * \n' +
            'FROM orderlist\n' +
            'JOIN item_one\n' +
            'ON orderlist.orderId = item_one.orderId\n' +
            'WHERE orderlist.orderId = ' + '"' + orderId + '";';

        connection.query(sql, function (err, result1) {
            if (err) {
                console.log('[SELECT ERROR] - ', err.message);
            }
            res.render('adOrder', {
                orderList: result1,
                notificationList : false,
                user: req.session.user
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
                    user: req.session.user
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
        StopOrder('已拒绝')
    }

    if(req.body.cancelOrderButton){
        StopOrder('已取消')
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
                OrderState(order[0].itemName);
                if (orderId.toString().substring(0,3) !== 'ONE') {
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
                }
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
                OrderState(order[0].itemName);
                var isFirstSQL='SELECT sum( case when noteState=\'已退回(首次检测)\' or noteState=\'已从临时仓库退回(首次检测)\' then 1 else 0 end) as returnTimes FROM notification WHERE orderId=\''+url.orderId+'\'';
                connection.query(isFirstSQL,function (err, result2) {
                    if(err){
                        console.log('[SELECT ERROR] - ',err.message);
                        return;
                    }


                    if(result2[0].returnTimes>0){
                        addNotification('已从临时仓库退回',req.body.saveNum);
                    }else{
                        addNotification('已从临时仓库退回(首次检测)',req.body.saveNum);
                    }


                });
                var flashUrl='adOrder?orderId='+url.orderId;
                return res.redirect('flash?url='+flashUrl)
            }
        }
    });


    function addNotification(enterModel,addSqlInput) {
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
                var  addSql = 'INSERT INTO notification (noteDate,noteType,noteState,noteContent,itemId,orderId) VALUES(?,?,?,?,?,?)';
                var  addSqlParams =[dateOutput, '采购事件更新',enterModel,addSqlInput,result0[0].itemId,url.orderId ];
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

router.post('/adItemOrderOne', function(req, res) {
    var  saveDate= new Date();
    var year= saveDate.getFullYear();
    var month=saveDate.getMonth()+1;
    var day=saveDate.getDate();
    var hour=saveDate.getHours();
    var min=saveDate.getMinutes();
    var sec=saveDate.getSeconds();
    var dateOutput= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
    var checkSql='SELECT orderId FROM orderlist WHERE orderId LIKE '+'"%'+year.toString()+month.toString() +day.toString()+'%"' + ' OR orderId LIKE '+'"%'+ 'ONE'+year.toString()+month.toString() +day.toString()+'%"';

    var state, applyDate, orderDate, commingDate, applyNote, replyNote, applier, itemId, itemModel, itemName, itemSupplier, totalNum, price, unit;

    applyDate = dateOutput;
    commingDate = req.body.commingDate;
    applyNote = req.body.applyNote;
    applier = req.body.applier;
    itemId = req.body.itemId;
    itemModel = req.body.itemModel;
    itemName = req.body.itemName;
    itemName = req.body.itemSupplier;
    totalNum = req.body.applyNum;
    itemPrice = req.body.itemPrice;
    itemUnit = req.body.itemUnit;

    state = '申请中';
    orderDate = dateOutput;
    replyNote = '';


    connection.query( checkSql,function (err, result1) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
        }
        var addId;
        if(result1.length===0){
            addId=1;
        }else {
            addId=result1.length+1;
        }
        var prefixId;
        var orderId;
        if(addId<10){
            prefixId='00';
            orderId='ONE'+year.toString()+month.toString() +day.toString()+prefixId+addId;
        }else if(addId<100&&addId>=10){
            prefixId='0';
            orderId='ONE'+year.toString()+month.toString() +day.toString()+prefixId+addId;
        }else{
            orderId='ONE'+year.toString()+month.toString() +day.toString()+addId;
        }

        var  addOrderSql = 'INSERT INTO orderlist(orderId,state,applyDate,orderDate,commingDate,itemId,applyNote,replyNote,applier,totalNum,getNum,pendingNum,returnNum,itemPrice,itemUnit) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
        var  addOrderSqlParams = [orderId,state,applyDate,orderDate,commingDate,itemId,applyNote,replyNote,applier,totalNum,0,0,0,itemPrice,itemUnit];
        console.log('addOrderSql: ' + addOrderSql);
        console.log('addOrderSqlParams: ' + addOrderSqlParams);
        connection.query(addOrderSql,addOrderSqlParams,function (err) {
            if(err){
                console.log('[INSERT ERROR] - ',err.message);
            }
            let addItemSql = 'INSERT INTO item_one(itemId, itemModel, itemName, itemSupplier, orderId) VALUES (?,?,?,?)';
            let addItemSqlParams = [itemId, itemModel, itemName, itemSupplier, orderId];
            console.log('addItemSql: ' + addItemSql);
            console.log('addItemSqlParams: ' + addItemSqlParams);
            connection.query(addItemSql,addItemSqlParams,function (err) {
                if(err){
                    console.log('[INSERT ERROR] - ',err.message);
                    return;
                }
                addNote('采购事件更新',itemName,orderId,'申请中');
            });
        });
    });

    res.redirect('/adOrderMan');
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
        var HTMLtext='';
        for(var j=0;j<component.length;j++){
            if (!component[j].cNote){component[j].cNote=''}
            HTMLtext += '<table class="noteButton2" cellspacing="0" cellpadding="0" style="width: 122.5%; ">\n'+
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
                '                                        <span class="componentInfo" style="margin-left: 430px">部件成本：<a style="font-weight:normal;color: #0050fa; ">' + component[j].cost + '</a></span>\n' +
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


                '                                    <tr cellspacing="0" cellpadding="0" id="'+machineId+component[j].componentId+'itemBox'+'"  style="width: 100%">\n' +
                '                                    </tr>\n' +


            '</table>'
        }
        res.json({
            component:component,
            HTMLtext:HTMLtext
        });

    });
});

//   ---查找部件物料---  A-B-C  设备，部件，物料
/* AJax get item List */
router.get('/ajaxItems', function(req, res) {
    const componentId = req.query.componentId;
    const machineId = req.query.machineId;
    const sql = 'SELECT item.itemId, itemName, itemPrice, item.itemModel, itemArea, itemNote, itemQuantity, component.categoryId, itemType, itemFileName\n' +
        'FROM component\n' +
        'INNER JOIN component_has_item\n' +
        'ON component_has_item.component_componentId = component.componentId\n' +
        'INNER JOIN item\n' +
        'ON component_has_item.item_itemId = item.itemId AND component_has_item.item_itemModel = item.itemModel\n' +
        'INNER JOIN category\n' +
        'ON component.categoryId = category.categoryId\n' +
        'INNER JOIN user\n' +
        'ON component.userId = user.userId\n' +
        'WHERE component.componentId = ' + '"' + componentId + '"'

    connection.query( sql,function (err, item) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send(err);
            return;
        }
        var HTMLtext='';
        for(var j=0;j<item.length;j++){
            HTMLtext +=  '<table cellspacing="0" cellpadding="0" style="width: 122.5%; ">\n'+
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
                '                                        <span class="itemInfo" style="margin-left: 380px">部件成本：<a style="font-weight:normal;color: #0050fa; ">' + item[j].itemPrice + '</a></span>\n' +
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
            HTMLtext:HTMLtext
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
router.post('/adBOMListMachineAdd', function (req, res) {
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
                let addSql1 = 'INSERT INTO machine (machineId,machineName,updateTime,designer,note) VALUES(?,?,?,?,?)';
                let addSqlParams1 = [addMachineModel, addMachineName, updateTime, addMachineDesigner, addMachineNote];
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
    let delComponentSql = 'DELETE FROM component WHERE machineId = '+'\''+machineId+'\'';
    let delMachineSql = 'DELETE FROM machine WHERE machineId = '+'\''+machineId+'\'';
    connection.query(delComponentSql,function (err) {
        if(err){
            console.log('[DELETE ERROR] - ',err.message);
            res.send('删除部件错误！' + err);
            return;
        }
        connection.query(delMachineSql,function (err) {
            if(err){
                console.log('[DELETE ERROR] - ',err.message);
                res.send('删除设备错误！' + err);
                return;
            }
            // --添加事件更新到首页--
            addNote('设备事件更新', machineId, machineId, '删除设备');
            res.redirect('/adBOMListMan')
        });
    });
});

//   ---修改设备---
/* POST adBOMListMachineEdit Page */
router.post('/adBOMListMachineEdit', function(req, res) {
    let  saveDate= new Date();
    let year= saveDate.getFullYear();
    let month=saveDate.getMonth()+1;
    let day=saveDate.getDate();
    let hour=saveDate.getHours();
    let min=saveDate.getMinutes();
    let sec=saveDate.getSeconds();
    let updateTime= year+'-'+month+'-'+day+' '+hour+':'+min+':'+sec;
    console.log('updateTime: ' + updateTime);

    let MachineModel = req.body.MachineModel;
    let MachineName = req.body.MachineName;
    let MachineDesigner = req.body.MachineDesigner;
    let MachineNote = req.body.MachineNote;
    MachineModel=pinyin(MachineModel,{style:pinyin.STYLE_FIRST_LETTER}).toString();
    MachineModel=MachineModel.replace(new RegExp(",",'g'),"").toUpperCase();

    let url=URL.parse(req.url,true).query;
    let modSql = 'UPDATE machine SET machineId = ?, machineName = ?, updateTime = ?, designer = ?, note = ? WHERE machineId = '+'\''+url.machineId+'\'';
    let modSqlParams = [MachineModel, MachineName, updateTime, MachineDesigner, MachineNote];
    connection.query(modSql,modSqlParams,function (err) {
        if(err){
            console.log('[UPDATE ERROR] - ',err.message);
            res.send(err);
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
    let machineComponentSql = 'SELECT machine.machineId, machineName, machine.updateTime AS mUpdateTime, machine.note AS mNote, designer, componentId, componentModel, componentName, component.updateTime AS cUpdateTime, component.note AS cNote, categoryName, cost As componentCost\n' +
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
    let machineSql = 'SELECT machineId, machineName, updateTime AS mUpdateTime, machine.note AS mNote, designer\n' +
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
                    res.render('adBOMListMachineMan', {
                        user: req.session.user,
                        category: category,
                        machine: machine,
                        users: users
                    });
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
        fileName = 'null';
    }

    let categorySql = 'SELECT * FROM category WHERE categoryName = ' + '"' + addComponentType + '"';
    connection.query(categorySql, function (err, category) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send('查找类别出错：' + '\n' + err);
            return;
        }
        let categoryId = category[0].categoryId;
        let addSql = 'INSERT INTO component(componentModel,componentName,updateTime,state,note,userId,categoryId,cost,fileName, machineId) VALUES(?,?,?,?,?,?,?,?,?,?)';
        let addSqlParams = [addComponentModel, addComponentName, updateTime, "正常", addComponentNote, designerId, categoryId,0,fileName, addToMachineId];
        connection.query(addSql, addSqlParams, function (err) {
            if (err) {
                console.log('[INSERT ERROR] - ', err.message);
                res.send('添加错误, 检查部件图号是否重复' + err);
                return;
            }
            // --添加事件更新到首页--
            addNote('部件事件更新', addComponentName, addComponentModel, '添加新部件');

            res.redirect('/adBOMListMachineMan?machineId=' + addToMachineId);
        });
    });
});

//   ---从设备中删除部件---
/* GET adBOMListComponentDelete Page */
router.get('/adBOMListComponentDelete', function(req, res) {
    let url=URL.parse(req.url,true).query;
    let componentId = url.componentId;
    let delSql = 'DELETE FROM component WHERE componentId = '+'\''+componentId+'\'';
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
        connection.query(delSql,function (err) {
            if(err){
                console.log('[DELETE ERROR] - ',err.message);
                res.send(err);
                return;
            }
            // 更新设备成本
            updateMachineCost(machineId);
            // --添加事件更新到首页--
            addNote('部件事件更新', componentId, componentId, '删除部件');
            res.redirect('/adBOMListMan')
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

    var BomListName, BomListModel, BomListNote, BomListType, userId, fileName;
    BomListName = req.body.BomListName;
    BomListModel = req.body.BomListModel;
    // let addComponentState = req.body.addComponentState;
    BomListNote = req.body.BomListNote;
    BomListType = req.body.BomListType;
    userId = req.session.user.userId;

    if (req.file){
        fileName=req.file.filename;
    } else {
        fileName = 'null';
    }

    let modSql = 'UPDATE component SET componentModel = ?,  componentName = ?, updateTime = ?, userId = ?, note = ?, categoryId = ?, fileName = ? WHERE componentId = '+'\''+componentId+'\'';
    let modSqlParams = [BomListModel, BomListName, updateTime, userId, BomListNote, BomListType, fileName];
    connection.query(modSql,modSqlParams,function (err) {
        if(err){
            console.log('[UPDATE ERROR] - ',err.message);
            res.send(err);
            return;
        }
        // --添加事件更新到首页--
        // addNote('BOM表事件更新', BomListName, BomListModel, '修改BOM表');
        res.redirect('/adBOMList?componentId=' + componentId);
    });

});


//   ---查找部件物料--- 详细页
/* GET adBOMList */
router.get('/adBOMList', function (req, res) {
    let url = URL.parse(req.url, true).query;
    // 部件有物料
    let componentItemSql = 'SELECT componentId, componentModel, componentName, component.updateTime, component.state, component.note, component.categoryId, category.categoryName, cost, fileName, userName, itemId, itemName, itemPrice, itemModel, itemType, itemNote, itemQuantity, machineName, machine.machineId\n' +
        'FROM component\n' +
        'INNER JOIN component_has_item\n' +
        'ON component_has_item.component_componentId = component.componentId\n' +
        'INNER JOIN machine\n' +
        'ON component.machineId = machine.machineId\n' +
        'INNER JOIN item\n' +
        'ON component_has_item.item_itemId = item.itemId AND component_has_item.item_itemModel = item.itemModel\n' +
        'INNER JOIN category\n' +
        'ON component.categoryId = category.categoryId\n' +
        'INNER JOIN user\n' +
        'ON component.userId = user.userId\n' +
        'WHERE componentId =' + '\'' + url.componentId + '\'' + '\n' +
        'ORDER BY itemType';
    // 部件无物料
    let componentSql = 'SELECT componentId, componentModel, componentName, component.updateTime, component.state, component.note, component.categoryId, category.categoryName, cost, fileName, userName, machineName, machine.machineId\n' +
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
                    res.render('adBOMList', {
                        user: req.session.user,
                        category: category,
                        component: component,
                        categoryName: categoryName,
                        machine: machine,
                    });
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
    searchSql = 'SELECT itemId, itemModel, itemName, itemNote, itemType, itemNum, itemUnit, itemSupplier\n' +
        'FROM item\n' +
        'WHERE itemId LIKE "'+ searchText + '" OR itemModel LIKE "'+ searchText + '" OR itemName LIKE "'+ searchText + '" OR itemNote LIKE "'+ searchText + '";'
    connection.query(searchSql,function (err, item) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            res.send('搜索物料错误！' + err);
            return;
        }
        var HTMLtext='';
        for(var j=0;j<item.length;j++){
            HTMLtext += '<div id="itemSelectBox'+j+'">\n' +
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
                '                                                <span class="itemInfo" style="position: relative">名称：<a style="font-weight: normal;color: #0050fa; position: relative">'+item[j].itemName+'</a></span>\n' +
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
            HTMLtext:HTMLtext
        });

    });
})

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

/* AJax Save ADD BOM List */
router.get('/ajaxSaveAdd', function(req, res) {
    const componentId = req.query.componentId;
    const items = req.query.items;
    const itemLength = items[0].length;
    var errorMessage;

    const addSql = 'INSERT INTO component_has_item(component_componentId, item_itemId, item_itemModel, itemQuantity) VALUES(?,?,?,?)'

    for (let i=0; i<itemLength; i++ ) {
        let itemId = items[0][i]
        let itemModel = items[1][i]
        let itemQty = items[2][i]

        var addSqlParams = [componentId,itemId,itemModel,itemQty];

        connection.query(addSql, addSqlParams, function (err) {
            if (err) {
                console.log('[INSERT ERROR] 从部件中添加物料错误！- ', err.message);
                errorMessage += '[INSERT ERROR] 从部件中添加物料错误！- ' + err.message + '\n';
                return;
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
        });
    }
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
    let addSql = 'INSERT INTO component_has_item(component_componentId, item_itemId, item_itemModel, itemQuantity) VALUES(?,?,?,?)'

    for (let i = 0; i < itemLength; i++) {
        let itemId = items[0][i]
        let itemModel = items[1][i]
        let itemQty = items[2][i]

        var addSqlParams = [componentId, itemId, itemModel, itemQty];

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
router.post('/componentCopy', function(req, res) {
    let url=URL.parse(req.url,true).query;
    let componentId = url.componentId;
    var userId, componentName, componentModel, componentType, componentNote, componentFileName, machineId, machineIds, i;
    userId = req.session.user.userId;
    componentName = req.body.addComponentName;
    componentModel = req.body.addComponentModel;
    componentType = req.body.BomListType;
    componentNote = req.body.addComponentNote;
    componentFileName = req.body.BomListFileName;
    machineIds = req.body.belongMachine;

    for (i=0; i<machineIds.length;i++) {
        machineId = machineIds[i];
        copyComponent(componentId, componentName, componentModel, componentType, componentNote, componentFileName, machineId, userId, i);
    }

    let flashUrl = '/adBOMListMan';
    res.redirect('flash?url='+flashUrl);
});

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

    let componentSql = 'SELECT item_itemId, item_itemModel, itemQuantity, cost\n' +
        'FROM component\n' +
        'INNER JOIN component_has_item\n' +
        'ON component_has_item.component_componentId = component.componentId\n' +
        'WHERE componentId = ' + '"' + componentId + '";';
    connection.query( componentSql,function (err, componentItems) {
        if (err) {
            console.log('[SELECT ERROR] - ', err.message);
            return;
        }
        var newComponentCost = componentItems[0].cost;
        if (!componentFileName){componentFileName = 'null'}
        let insertSql = 'INSERT INTO component(componentModel,componentName,updateTime,state,note,userId,categoryId,cost,fileName, machineId) VALUES(?,?,?,?,?,?,?,?,?,?)';
        let insertParam = [componentModel,componentName,updateTime,'正常',componentNote,userId,componentType,newComponentCost,componentFileName, machineId]
        connection.query( insertSql, insertParam,function (err) {
            if (err) {
                console.log('[INSERT ERROR] 增加复制部件错误！ - ', err.message);
                return;
            }
            // --添加事件更新到首页--
            addNote('部件事件更新', componentName, componentModel, '添加新部件');
            updateMachineCost(machineId);
            let addSql = 'INSERT INTO component_has_item(component_componentId, item_itemId, item_itemModel, itemQuantity) VALUES(?,?,?,?)'
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
                    let addSqlParams = [newComponentId, itemId, itemModel, itemQty];
                    connection.query(addSql, addSqlParams, function (err) {
                        if (err) {
                            console.log('[INSERT ERROR] 从部件中添加物料错误！ - ', err.message);
                        }
                    });
                }
            });
        });
    });
}


//   ---复制机械---
/* POST machineCopy */
router.post('/machineCopy', function(req, res) {
    var userId, copyMachineId, machineName, machineModel, machineDesigner, machineNote;
    copyMachineId = req.body.copyMachineModel;
    // userId = req.session.user.userId;
    machineName = req.body.addMachineName;
    machineModel = req.body.addMachineModel;
    machineDesigner = req.body.addMachineDesigner;
    machineNote = req.body.addMachineNote;

    copyMachine(copyMachineId, machineName, machineModel, machineDesigner, machineNote);

    let flashUrl = '/adBOMListMan';
    res.redirect('flash?url='+flashUrl);
});

function copyMachine(copyMachineId, machineName, machineModel, machineDesigner, machineNote){
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
        let newMachineSql = 'INSERT INTO machine (machineId,machineName,updateTime,designer,note) VALUES(?,?,?,?,?)';
        let newMachineParams = [machineModel, machineName, updateTime, machineDesigner, machineNote];
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
                componentFileName = machineComponents[i].fileName;
                userId = machineComponents[i].userId;
                copyComponent(componentId, componentName, componentModel, componentType, componentNote, componentFileName, machineModel, userId, i);
            }
        });
    });
}











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
