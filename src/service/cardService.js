var request = require('request'),
    timeService = require('./timeService'),
    q = require('q');

exports.shouldDueDateNotificationBePosted = function(card, userTimezoneOffset) {
  var timeDifference = timeService.getTimeDifferenceForCard(card, userTimezoneOffset);

  if (card.isAchieved() || card.hasNoDueDate() || card.hasBeenAlreadyPostedToday(timeDifference)) {
    return false;
  }

  return isInNotifiableTimeframe(timeDifference);
}

exports.getCardsForUser = function(userId) {
  var deferred = q.defer();
  request.get({
      url: 'http://paths.unleash.x-team.com/api/v1/paths/' + userId,
      headers: {
        'Accept': 'application/json'
      }
  }, (err, httpResponse, body) => {
    if (err || (body && body.ok === false)) {
        deferred.reject(new Error(err));
    }

    var data = JSON.parse(body);
    deferred.resolve(data.goals);
  });

  return deferred.promise;
}

exports.markNotificationAsSent = function(userId, card, timeDifference) {
  request.put({
    url:'http://paths.unleash.x-team.com/api/v1/paths/' + userId + '/goals/' + card.getId(),
    form: {
      lastNotificationSent: timeDifference
    },
    headers: {
      'Accept': 'application/json'
    }
  });
}

function isInNotifiableTimeframe(timeDifference) {
  return timeDifference < 0 || [7, 3, 1, 0].indexOf(timeDifference) !== -1;
}
