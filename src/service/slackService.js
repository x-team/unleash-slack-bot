var timeService = require('./timeService'),
    cardService = require('./cardService'),
    config  = require('../config.json'),
    request = require('request'),
    rollbar = require('rollbar');

rollbar.init(config.rollbarToken);

exports.postPrivateNotification = function(userId, card, slackUser) {
  var timeDifference = timeService.getTimeDifferenceForCard(card, slackUser.tz_offset);
  var slackHandle = '@' + slackUser.name;
  var message = 'Your "' + card.getGoalName() + '" goal is ' + timeService.getTimeDifferenceText(timeDifference) + '… Feel free to reach out to your Unleasher if you need any help!';

  postNotification(userId, card, timeDifference, {
    channel: slackHandle,
    text: message,
    token: config.slackToken,
    icon_url: config.iconUrl,
    username: config.botUsername,
    attachments: []
  });
}

exports.postUnleasherNotification = function(userId, card, slackUser) {
  if (!config.unleasherChannel) {
    console.error('No unleasher channel set!');
    return;
  }

  var timeDifference = timeService.getTimeDifferenceForCard(card, slackUser.tz_offset);
  var message = (slackUser.real_name || slackUser.name) + '\'s "' + card.getGoalName() + '" goal is ' + timeService.getTimeDifferenceText(timeDifference) + '!';

  postNotification(userId, card, timeDifference, {
    channel: config.unleasherChannel,
    text: message,
    token: config.slackToken,
    icon_url: config.iconUrl,
    username: config.botUsername,
    attachments: []
  });
}

/**
 * Posts a notification to Slack
 * @param {Object} card
 * @param {Number} timeDifference
 * @param {Object} data
 * @param {String} data.channel - Slack channel or Slack registered user
 * @param {String} data.text - Notification contents
 */
function postNotification(userId, card, timeDifference, data) {
  request.post(
    {
      url:'https://slack.com/api/chat.postMessage',
      form: data
    },
    function(err, httpResponse, body) {
      if (err || (body && body.ok === false)) {
        var msg = 'Couldn\'t post to ' + data.channel + '!';

        console.error(msg);

        rollbar.reportMessageWithPayloadData(msg, {
          level: 'error',
          data: data.text,
          response: body
        });
      } else {
        cardService.markNotificationAsSent(userId, card, timeDifference);

        rollbar.reportMessageWithPayloadData('Posted a message to ' + data.channel, {
          level: 'info',
          data: data.text,
          response: body
        });
      }
  });
}
