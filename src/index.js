var request = require('request'),
    express = require('express'),
    config  = require('./config.json'),
    cors    = require('cors'),
    Firebase = require('firebase'),
    bodyParser = require('body-parser'),
    assign = require('lodash.assign'),
    rollbar = require('rollbar'),
    app  = express(),
    ref = new Firebase(config.firebaseUrl),
    slackRef = ref.child('slack'),
    debugMode = config.debugMode === 'true',
    lastDate;

var SLACK_CONFIG = {
  token: config.slackToken,
  icon_url: config.iconUrl,
  username: config.botUsername
};

var users = {
  general: {
    name: config.notificationsChannel
  }
};

app.use(cors());
app.use(bodyParser.json({extended: true}));

// Authenticate with Firebase
ref.authWithCustomToken( config.firebaseToken, function(error) {
  if (error) {
    console.log('Authentication Failed!', error);
    res.end();
  }

  console.log('Authenticated to Firebase!');

  getUsersList(function() {
    checkDueDates();
    setInterval(checkDueDates, 1000 * 60 * 60);
  });


  app.post('/notify', notifyOnSlack);
});

function notifyOnSlack(req, res) {
  if (req.body.debugMode || debugMode) {
    res.end('debug mode enabled: aborting posting the notification');
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  slackRef.child(req.body.uid).once('value', function(snapshot) {
    if (snapshot.val() == req.body.token && users[req.body.user]) {
      var channel = req.body.user === 'general' ? users[req.body.user].name
        : '@' + users[req.body.user].name;

      var data = assign(SLACK_CONFIG, {
        text: req.body.text,
        channel: channel
      });


      if (req.body.attachments) {
        data.attachments = JSON.stringify(formatAttachments(req.body));
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
}

function formatAttachments(body) {
  var attachments = body.attachments;

  // Add URL to the card
  if (body.queryString) {
    attachments.map(function(attachment) {
      attachment.title_link = config.siteUrl + body.queryString;
      return attachment;
    })
  }

  return attachments;
}

function getUsersList(callback) {
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
      // Check if Slack user for a given email address exists
      if (!users['@' + email]) {
        return;
      }

      snapshot.child('cards').forEach(function(card) {
        if (shouldDueDateNotificationBePosted(card)) {
          postPrivateNotification(card, email);
          postUnleasherNotification(card, email);
        }
      });
    });
  });
}

function getTimeDifferenceForCard(card) {
  return Math.floor((+new Date(card.child('dueDate').val()) - new Date()) / (1000 * 60 * 60 * 24));
}

function shouldDueDateNotificationBePosted(card) {
  if (card.child('achieved').val() || !card.child('dueDate').val()) {
    return false;
  }

  var timeDifference = getTimeDifferenceForCard(card);

  return timeDifference <= 0 || [7, 3, 1].indexOf(timeDifference) !== -1;
}

function postPrivateNotification(card, email) {
  if (debugMode) {
    return;
  }

  var timeDifference = getTimeDifferenceForCard(card);

  var privateMessage = timeDifference <= 0 ? 'Your "' + card.child('type').val() + '" goal is overdue… Feel free to reach out to your Unleasher if you need any help!' :
    'Your "' + card.child('type').val() + '" goal is due in ' + timeDifference + ' day' + (timeDifference === 1 ? '' : 's') + '… Feel free to reach out to your Unleasher if you need any help!';

  var slackHandle = '@' + users['@' + email].name;

  var data = assign(SLACK_CONFIG, {
    channel: slackHandle,
    text: privateMessage
  });

  request.post({url:'https://slack.com/api/chat.postMessage', form: data});

  rollbar.reportMessage('Posted private message to ' + slackHandle + ': ' + privateMessage, 'info');
}

function postUnleasherNotification(card, email) {
  if (debugMode) {
    return;
  }

  var timeDifference = getTimeDifferenceForCard(card);

  var currentUser = users['@' + email] || {};

  if ( config.unleasherChannel ) {
    var unleasherMessage = timeDifference <= 0 ? (currentUser.real_name || currentUser.name) + '\'s "' + card.child('type').val() + '" goal is overdue!' :
      (currentUser.real_name || currentUser.name) + '\'s "' + card.child('type').val() + '" goal is due in ' + timeDifference + ' day' + (timeDifference === 1 ? '!' : 's!');

    var data = assign(SLACK_CONFIG, {
      channel: config.unleasherChannel,
      text: unleasherMessage
    });

    request.post({url:'https://slack.com/api/chat.postMessage', form: data}, function(err, httpResponse, body) {
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
