var request = require('request'),
    express = require('express'),
    config  = require('./config.json'),
    cors    = require('cors'),
    bodyParser = require('body-parser'),
    rollbar = require('rollbar'),
    Card = require('./model/card'),
    forEach = require('lodash.foreach'),
    cardService = require('./service/cardService'),
    userService = require('./service/userService'),
    slackService = require('./service/slackService'),
    app  = express(),
    debugMode = config.debugMode === 'true';

var users = {
  general: {
    name: config.notificationsChannel
  }
};

app.use(cors());
app.use(bodyParser.json({extended: true}));

setInterval(
  function () {
    getUsersList(function() {
      checkDueDates();
    });
  },
  1000 * 60 * 60
);

app.post('/notify', notifyOnSlack);

function notifyOnSlack(req, res) {
  if (req.body.debugMode || debugMode) {
    res.end('debug mode enabled: aborting posting the notification');
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (users[req.body.user]) {
    var channel = req.body.user === 'general' ? users[req.body.user].name
      : '@' + users[req.body.user].name;

    var data = {
      text: req.body.text,
      channel: channel,
      token: config.slackToken,
      icon_url: config.iconUrl,
      username: config.botUsername,
      attachments: []
    };

    if (req.body.attachments) {
      data.attachments = JSON.stringify(formatAttachments(req.body));
    }

    request.post(
      {
        url:'https://slack.com/api/chat.postMessage',
        form: data
      },
      function(err, httpResponse, body) {
        console.log('Posted a notification: ', body);
        rollbar.reportMessage('Posted a notification ' + body, 'info');
      }
    );

    res.end('ok');
  } else {
    res.end('no such channel/user');
    rollbar.reportMessage('Unleash email not registered in Slack: ' + req.body.user, 'warning');
  }
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
  userService.getUsers().then(function(profiles) {
    forEach(profiles, function(profile) {
      // Check if Slack user for a given email address exists
      var slackUser = users['@' + profile.email];
      if (!slackUser) {
        return;
      }

      cardService.getCardsForUser(profile.id).then(function (cards) {
        if (cards !== null) {
          forEach(cards, function(jsonCard) {
            var card = new Card();
            card.fromJson(jsonCard);
            if (cardService.shouldDueDateNotificationBePosted(card, slackUser.tz_offset)) {
              slackService.postPrivateNotification(profile.id, card, slackUser);
              slackService.postUnleasherNotification(profile.id, card, slackUser);
            }
          });
        }
      });
    });
  });
}

app.use(rollbar.errorHandler(config.rollbarToken));

app.listen(8081);
