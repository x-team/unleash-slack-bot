exports.getTimeDifferenceForCard = function(card, userTimezoneOffset) {
  var localTimeDifferenceInSeconds = Math.round((+new Date(card.getDueDate()) - new Date()) / 1000);
  var localTimeOffsetInSeconds = (new Date().getTimezoneOffset()*60);
  var secondsInADay = 60 * 60 * 24;

  return Math.floor((localTimeDifferenceInSeconds - userTimezoneOffset - localTimeOffsetInSeconds) / secondsInADay) + 1;
}

exports.getTimeDifferenceText = function(timeDifference) {
  if (timeDifference < 0) {
    return 'overdue';
  } else if (timeDifference === 0) {
    return 'due today';
  } else if (timeDifference === 1) {
    return 'due tomorrow';
  } else {
    return 'due in ' + timeDifference + ' days';
  }
}
