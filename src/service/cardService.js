exports.shouldDueDateNotificationBePosted = function(card, userTimezoneOffset) {
  var timeDifference = getTimeDifferenceForCard(card, userTimezoneOffset);

  if (card.isAchieved() || card.hasNoDueDate() || card.hasBeenAlreadyPosted(timeDifference)) {
    return false;
  }

  return isInNotifiableTimeframe(timeDifference);
}

function isInNotifiableTimeframe(timeDifference) {
  return [7, 3, 1, 0].indexOf(timeDifference) !== -1;
}

function getTimeDifferenceForCard(card, userTimezoneOffset) {
  var localTimeDifferenceInSeconds = Math.round((+new Date(card.getDueDate()) - new Date()) / 1000);
  var localTimeOffsetInSeconds = (new Date().getTimezoneOffset()*60);
  var secondsInADay = 60 * 60 * 24;

  return Math.floor((localTimeDifferenceInSeconds - userTimezoneOffset - localTimeOffsetInSeconds) / secondsInADay) + 1;
}
