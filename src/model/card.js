var Card = function(firebaseCard) {
}

Card.prototype.fromFirebase = function(firebaseCard) {
  this.achieved = firebaseCard.child('achieved').val();
  this.dueDate = firebaseCard.child('dueDate').val();

  var notifications = [];
  firebaseCard.child('notificationsAlreadySent').forEach(function(notification) {
    notifications[notification.key()] = notification.val();
  });
  this.notificationsAlreadySent = notifications;
}

Card.prototype.isAchieved = function() {
  return this.achieved;
}

Card.prototype.hasNoDueDate = function() {
  return !this.dueDate;
}

Card.prototype.getDueDate = function () {
  return this.dueDate;
}

Card.prototype.hasBeenAlreadyPosted = function(daysToDueDate) {
  return this.notificationsAlreadySent[daysToDueDate] === true;
}

module.exports = Card;
