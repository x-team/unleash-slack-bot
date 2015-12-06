var request = require('request'),
    express = require('express'),
    config  = require('./config.json'),
    cors    = require('cors'),
    Firebase = require('firebase'),
    bodyParser = require('body-parser'),
    app  = express(),
    ref = new Firebase(config.firebaseURL),
    slackRef = ref.child('slack');

app.use(cors());

app.use(bodyParser.json({extended: true}));

ref.authWithCustomToken( config.firebaseToken, function(error) {
  if (error) {
    console.log('Authentication Failed!', error);
  } else {
    console.log('Authenticated successfully');
  }

  app.post('/notify', function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    slackRef.child(req.body.uid).once('value', function(snapshot) {

      if (snapshot.val() == req.body.token) {
        console.log('Channel: ' + req.body.user + ', text:' + req.body.text );

        request.post({url:'https://slack.com/api/chat.postMessage', form: {
          token: config.slackToken,
          channel: '@' + req.body.user,
          text: req.body.text
        }}, function(err, httpResponse, body){});

        res.end('ok');
      } else {
        res.end('invalid token');
      }
    });
  });
});

app.listen(8081);
