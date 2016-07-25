var request = require('request'),
    timeService = require('./timeService'),
    forEach = require('lodash.foreach'),
    q = require('q');

exports.shouldDueDateNotificationBePosted = function(card, userTimezoneOffset) {
  var timeDifference = timeService.getTimeDifferenceForCard(card, userTimezoneOffset);

  if (card.isAchieved() || card.hasNoDueDate() || card.hasBeenAlreadyPostedToday(timeDifference)) {
    return false;
  }

  return isInNotifiableTimeframe(timeDifference);
};

exports.getPathsForUser = function(userId) {
  var deferred = q.defer();
  request.get({
      url: 'http://paths.unleash.x-team.com/api/v1/paths?userId=' + userId,
      headers: {
        'Accept': 'application/json'
      }
  }, function(err, httpResponse, body) {
    if (err || (body && body.ok === false)) {
        deferred.reject(new Error(err));
    }

    deferred.resolve(JSON.parse(body));
  });

  return deferred.promise;
};

exports.markNotificationAsSent = function(pathId, card, timeDifference) {
  request.put({
    url:'http://paths.unleash.x-team.com/api/v1/paths/' + pathId + '/goals/' + card.getId(),
    form: {
      lastNotificationSent: timeDifference
    },
    headers: {
      'Accept': 'application/json'
    }
  });
};

function isInNotifiableTimeframe(timeDifference) {
  return timeDifference < 0 || [7, 3, 1, 0].indexOf(timeDifference) !== -1;
};
