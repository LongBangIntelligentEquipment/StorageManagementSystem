var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var session=require('express-session');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//------------登录拦截session配置----------------------------------
app.use(session({
    secret:'LB_ERP',
    resave:false,
    saveUninitialized:true,
    cookie:{ maxAge: 1000*60*60*4}
}));


app.get('*',function (req,res,next) {
    var user = req.session.user;
    var path=req.path
    //console.log(user)
    if(path !='/login' && path !='/register' && path !='/resetPassword'){
        if(!user){
            res.redirect('/login')
        }
    }
    next()
})
//------------------------------------------------------

app.use('/', indexRouter);


app.use('/', require('./routes/loginBlock'));
app.use('/', require('./routes/adERPModule'));
app.use('/', require('./routes/adMESModule'));
app.use('/', require('./routes/adBOMTableModule'));
app.use('/', require('./routes/upload'));
app.use('/', require('./routes/users'));




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
