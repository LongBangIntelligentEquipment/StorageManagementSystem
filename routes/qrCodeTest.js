var express = require('express');
var router = express.Router();
var qr = require('qr-image')

/* GET home page. */
router.get('/qrCodeTest', function(req, res, next) {
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
    })
    res.render('qrCodeTest', { title: ' ' });
});

module.exports = router;
