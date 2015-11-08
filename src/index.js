var request = require('request'),
    express = require('express'),
    config  = require('./config.json'),
    Firebase = require('firebase'),
    bodyParser = require('body-parser'),
    app  = express(),
    ref = new Firebase(config.firebaseURL),
    slackRef = ref.child('slack');

app.use(bodyParser.urlencoded({extended: true}));

ref.authWithCustomToken( config.firebaseToken, function(error) {
  if (error) {
    console.log('Authentication Failed!', error);
  } else {
    console.log('Authenticated successfully');
  }

  app.post('/token', function(req, res) {
    var data = {};
    data[req.body.uid] = Math.random().toString(36).replace(/^../, '');

    slackRef.set(data);

    res.end('ok');
  });

  app.post('/notify', function(req, res) {
    request.post({url:'https://slack.com/api/chat.postMessage', form: {
      token: config.slackToken,
      channel: req.body.user,
      text: req.body.text
    }}, function(err, httpResponse, body){});

    res.end('ok');
  });
});

app.listen(8081);
