var request = require('request'),
    express = require('express'),
    config  = require('./config.json'),
    cors    = require('cors'),
    Firebase = require('firebase'),
    bodyParser = require('body-parser'),
    rollbar = require('rollbar'),
    app  = express(),
    users = {
      general: {
        name: config.notificationsChannel
      }
    },
    ref = new Firebase(config.firebaseUrl),
    slackRef = ref.child('slack'),
    lastDate;

app.use(cors());

app.use(bodyParser.json({extended: true}));

ref.authWithCustomToken( config.firebaseToken, function(error) {
  if (error) {
    console.log('Authentication Failed!', error);
  } else {
    console.log('Authenticated successfully');
  }

  updateUsers(function() {
    checkDueDates();
    setInterval(checkDueDates, 1000 * 60 * 60);
  });


  app.post('/notify', function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    slackRef.child(req.body.uid).once('value', function(snapshot) {
      if (snapshot.val() == req.body.token && users[req.body.user]) {
        var data = {
          token: config.slackToken,
          text: req.body.text,
          channel: users[req.body.user].name,
          icon_url: config.iconUrl,
          username: 'Unleash'
        };

        if (req.body.attachments) {
          // Add URL to the card
          if (req.body.queryString) {
            req.body.attachments.map(function(attachment) {
              attachment.title_link = config.siteUrl + req.body.queryString;
              return attachment;
            })
          }

          data.attachments = JSON.stringify(req.body.attachments);
        }

        request.post({url:'https://slack.com/api/chat.postMessage', form: data}, function(err, httpResponse, body) {
          console.log('Posted a notification: ', body);
          rollbar.reportMessage('Posted a notification ' + body, 'info');
        });

        res.end('ok');
      } else {
        if (!(snapshot.val() == req.body.token)) {
          res.end('invalid token');
          rollbar.reportMessage('Invalid token: ' + req.body.token, 'warning');
          return;
        }
        if (!users[req.body.user]) {
          res.end('no such channel/user');
          rollbar.reportMessage('Unleash email not registered in Slack: ' + req.body.user, 'warning');
        }
      }
    });
  });
});

function updateUsers(callback) {
  request.post({
    url:'https://slack.com/api/users.list',
    form: {
      token: config.slackToken
    }
  }, function(err, httpResponse, body) {
    JSON.parse(body).members.map(function(user) {
      user.profile && user.profile.email && (users['@' + user.profile.email.replace(/\+.*?@/, '@')] = user);
    });
    callback();
  });
}

function checkDueDates() {
  if ( lastDate == (new Date()).getDate() ) {
    return;
  }

  lastDate = (new Date()).getDate();

  ref.child('users').once('value', function(snapshot) {
    snapshot.forEach(function(snapshot) {

      var email = snapshot.val().google.email;

      snapshot.child('cards').forEach(function(card) {
        if (!card.child('dueDate').val() || !users['@' + email]) {
          return;
        }

        var cardData = card.val();

        var timeDifference = Math.floor((+new Date(card.child('dueDate').val()) - new Date()) / (1000 * 60 * 60 * 24));

        if (dueDateNotificationShouldBePosted(timeDifference)) {
          postPrivateNotification(timeDifference, cardData, email);
          postUnleasherNotification(timeDifference, cardData, email);
        }
      });
    });
  });
}

function dueDateNotificationShouldBePosted(timeDifference) {
  return timeDifference === 0 || [7, 3, 1].indexOf(timeDifference) !== -1;
}

function postPrivateNotification(timeDifference, cardData, email) {
  var privateMessage = timeDifference == 0 ? 'Your "' + cardData.type + '" goal is overdue… Feel free to reach out to your Unleasher if you need any help!' :
    'Your "' + cardData.type + '" goal is due in ' + timeDifference + ' day' + (timeDifference === 1 ? '' : 's') + '… Feel free to reach out to your Unleasher if you need any help!';

  var slackHandle = '@' + users['@' + email].name;

  request.post({url:'https://slack.com/api/chat.postMessage', form: {
    token: config.slackToken,
    channel: slackHandle,
    text: privateMessage
  }});
  rollbar.reportMessage('Posted private message to ' + slackHandle + ': ' + privateMessage, 'info');
}

function postUnleasherNotification(timeDifference, cardData, email) {
  var currentUser = users['@' + email] || {};

  if ( config.unleasherChannel ) {
    var unleasherMessage = timeDifference == 0 ? (currentUser.real_name || currentUser.name) + '\'s "' + cardData.type + '" goal is overdue!' :
      (currentUser.real_name || currentUser.name) + '\'s "' + cardData.type + '" goal is due in ' + timeDifference + ' day' + (timeDifference === 1 ? '!' : 's!');

    request.post({url:'https://slack.com/api/chat.postMessage', form: {
      token: config.slackToken,
      channel: config.unleasherChannel,
      text: unleasherMessage
    }}, function(err, httpResponse, body) {
      rollbar.reportMessageWithPayloadData('Posted unleasher message to ' + config.unleasherChannel, {
        level: 'info',
        data: unleasherMessage,
        response: body
      });
    });
  }
}

app.use(rollbar.errorHandler(config.rollbarToken));

app.listen(8081);
