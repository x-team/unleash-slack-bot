var request = require('request'),
    express = require('express'),
    config  = require('./config.json'),
    Firebase = require('firebase'),
    bodyParser = require('body-parser'),
    app  = express();

app.use(bodyParser.urlencoded({extended: true}));

app.post('/notify', function(req, res) {

  request.post({url:'https://slack.com/api/chat.postMessage', form: {
    token: config.token,
    channel: req.body.user,
    text: req.body.text
  }}, function(err, httpResponse, body){});

  res.end('ok');
});

app.listen(8081);
